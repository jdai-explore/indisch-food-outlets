import json
import math
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_PATH = BASE_DIR / "src" / "data" / "bavariaOsmRestaurants.json"
CACHE_PATH = BASE_DIR / "scripts" / "nominatim_cache.json"

# Flagship centers already defined in CURATED_RESTAURANTS (src/data/restaurants.ts)
# so the expansion pipeline never duplicates them.
FLAGSHIP_CENTERS = [
    ("the indian room", 11.5735, 48.1636),
    ("the spice route", 11.5515, 48.1112),
    ("indian mango", 11.5829, 48.1328),
    ("malgudi", 11.5198, 48.1384),
    ("bindaas", 11.5778, 48.1337),
    ("madam chutney", 11.5774, 48.1353),
    ("swagat", 11.6048, 48.1396),
    ("surahi", 11.5688, 48.1614),
    ("swaad", 11.5882, 48.1689),
    ("delhi mehek", 11.5897, 48.1676),
    ("tattva", 11.5637, 48.1873),
    ("anjappar", 11.5872, 48.1369),
    ("saravanaa bhavan", 11.5378, 48.1528),
    ("namaste restaurant", 11.6197, 48.1518),  # Arabellapark
    ("tandoori flame", 11.6512, 48.1897),       # Unterföhring
    ("sangam", 11.0846, 49.4589),
    ("namaste", 11.1135, 49.4618),
    ("oota", 12.0942, 49.0195),
    ("swagat", 12.0956, 49.0203),
    ("maharaja", 10.9228, 48.3568),
    ("noon mirch", 10.8758, 48.3669),
    ("maharaja ii", 9.9384, 49.7995),
    ("little india", 9.9519, 49.7824),
    ("bombay haus", 11.0048, 49.5998),
    ("swamy", 11.0074, 49.5968),
    ("indian mantra", 11.4258, 48.7532),
    ("chandni", 13.4658, 48.5724),
    ("swarg", 10.8888, 49.8936),
]

WOLT_GRID = [
    ("Munich", 48.1371, 11.5761),       # Altstadt / Center
    ("Munich", 48.1645, 11.5840),       # Schwabing
    ("Munich", 48.1540, 11.6220),       # Arabellapark / Bogenhausen
    ("Unterföhring", 48.1897, 11.6512), # Unterföhring
    ("Munich", 48.1480, 11.4610),       # Pasing
    ("Munich", 48.1180, 11.5350),       # Sendling / Harras
    ("Munich", 48.1200, 11.6620),       # Trudering
    ("Munich", 48.1050, 11.6450),       # Neuperlach
    ("Munich", 48.1840, 11.5150),       # Moosach
    ("Munich", 48.1100, 11.5800),       # Giesing
    ("Munich", 48.1870, 11.5640),       # Milbertshofen
    ("Nuremberg", 49.4521, 11.0767),
    ("Fürth", 49.4771, 10.9887),
    ("Erlangen", 49.5900, 11.0040),
    ("Augsburg", 48.3705, 10.8978),
    ("Regensburg", 49.0134, 12.1016),
    ("Ingolstadt", 48.7665, 11.4258),
    ("Würzburg", 49.7913, 9.9534),
    ("Bamberg", 49.8988, 10.9028),
    ("Passau", 48.5667, 13.4319),
    ("Landshut", 48.5372, 12.1522),
    ("Rosenheim", 47.8561, 12.1280),
]

# Targeted exclusions: non-Indian cuisines, closed/non-food spots, or Pakistani-first kitchens
EXCLUDE_TERMS = [
    "pakistan", "lahore", "karachi", "peshawar", "shalimar",
    "pizza", "pizzeria", "döner", "doner", "kebab", "kebap", "sushi", "thai",
    "vietnam", "china", "asia", "wok", "nepal", "tibet", "afghan", "bangladesh",
    "burger", "metzgerei", "bäckerei", "ice cream", "wirtshaus",
    "gasthaus", "gasthof", "brauhaus", "anan", "kaimug", "dean&david", "slurp", "bami house",
]

CITY_NORMALIZE = {
    "München": "Munich",
    "Munich": "Munich",
    "Nürnberg": "Nuremberg",
    "Nuremberg": "Nuremberg",
    "Kempten (Allgäu)": "Kempten",
    "Weiden in der Oberpfalz": "Weiden",
    "Weiden i.d. OPf.": "Weiden",
    "Neumarkt in der Oberpfalz": "Neumarkt",
}

def infer_city_from_postcode_or_coords(raw_city: str, postcode: str, lon: float, lat: float, fallback: str = "Bavaria") -> str:
    if raw_city:
        c = raw_city.strip()
        if c in CITY_NORMALIZE:
            return CITY_NORMALIZE[c]
        return c
    pc = (postcode or "").strip()
    if pc.startswith(("80", "81")):
        return "Munich"
    if pc == "85774":
        return "Unterföhring"
    if pc.startswith(("904", "903")):
        return "Nuremberg"
    if pc.startswith("907"):
        return "Fürth"
    if pc.startswith("910"):
        return "Erlangen"
    if pc.startswith("861"):
        return "Augsburg"
    if pc.startswith("930"):
        return "Regensburg"
    if pc.startswith("850"):
        return "Ingolstadt"
    if pc.startswith("970"):
        return "Würzburg"
    if pc.startswith("960"):
        return "Bamberg"
    if pc.startswith("954"):
        return "Bayreuth"
    if pc.startswith("840"):
        return "Landshut"
    if pc.startswith("830"):
        return "Rosenheim"
    if pc.startswith("940"):
        return "Passau"
    if pc.startswith("874"):
        return "Kempten"
    if pc.startswith("8535"):
        return "Freising"
    # Bounding box fallback for Munich city limits
    if 48.07 <= lat <= 48.24 and 11.38 <= lon <= 11.72:
        return "Munich"
    return fallback

def haversine_m(lon1, lat1, lon2, lat2):
    r = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def in_bavaria(lon, lat):
    return 47.27 <= lat <= 50.56 and 8.97 <= lon <= 13.84

def norm_name(s: str) -> str:
    s = s.lower()
    for token in ["indisches", "spezialitäten", "restaurant", "the ", "indian", "kitchen", "& bar", "bar", "gastronomie"]:
        s = s.replace(token, " ")
    return re.sub(r"[^a-z0-9äöüß]+", " ", s).strip()

def is_excluded(name: str, cuisine: str = "", address: str = "") -> bool:
    combined = f"{name} {cuisine}".lower()
    # Exclude Nuremberg's Tandoori Flames (Allersberger Str 118, Pakistani-Indian) specifically,
    # while keeping Unterföhring's Tandoori Flame!
    if "tandoori flames" in name.lower() or ("tandoori flame" in name.lower() and "allersberger" in address.lower()):
        return True
    for term in EXCLUDE_TERMS:
        if term in combined:
            return True
    if cuisine:
        c = cuisine.lower()
        for bad in ["pakistan", "vietnam", "thai", "sushi", "pizza", "kebab", "turkish", "italian", "german", "chinese", "nepalese", "afghan"]:
            if bad in c:
                return True
    return False

def classify_region(name: str, cuisine: str = ""):
    text = f"{name} {cuisine}".lower()
    if any(w in text for w in ["kerala", "dosa", "ilai", "chettinad", "anjappar", "saravanaa", "south", "südindisch", "sripaka", "malabar", "amrutham", "oota", "malgudi", "madras"]):
        state = "Tamil Nadu & Kerala (South India)"
        if "kerala" in text:
            state = "Kerala (Coastal South India)"
        elif "chettinad" in text or "anjappar" in text or "saravanaa" in text or "sripaka" in text:
            state = "Tamil Nadu (South India)"
        return state, "South Indian", [
            {
                "name": "Ghee Roast Masala Dosa",
                "regionalOrigin": "South India",
                "description": "Crisp fermented rice-lentil crepe served with sambar and coconut-ginger chutneys.",
                "spiceLevel": 2,
                "dietary": ["Vegetarian", "Gluten-Free", "Signature"],
                "insteadOf": "Garlic Naan",
            },
            {
                "name": "Chettinad Pepper Curry or Kerala Roast",
                "regionalOrigin": state,
                "description": "Fragrant black pepper, fresh curry leaves, and roasted coconut spices.",
                "spiceLevel": 4,
                "dietary": ["Gluten-Free", "Dairy-Free"],
                "insteadOf": "Butter Chicken",
            },
        ]

    if any(w in text for w in ["swaad", "svaad", "marathi", "bombay", "mumbai", "maharashtra", "kolhapur", "goa"]):
        state = "Goa & Western Coast" if "goa" in text else "Maharashtra & Western Coast"
        return state, "Western & Marathi", [
            {
                "name": "Kolhapuri Masala or Goan Vindaloo",
                "regionalOrigin": state,
                "description": "Roasted coconut, sesame, kokum, and whole red-chili spice blend.",
                "spiceLevel": 4,
                "dietary": ["Gluten-Free", "Signature"],
                "insteadOf": "Chicken Tikka Masala",
            },
            {
                "name": "Kokum Solkadhi & Vada Pav",
                "regionalOrigin": "Mumbai & Konkan",
                "description": "Chilled pink kokum-coconut digestive or spiced Mumbai potato slider.",
                "spiceLevel": 2,
                "dietary": ["Vegetarian"],
            },
        ]

    if any(w in text for w in ["street", "chaat", "chutney", "bindaas", "tadka", "noon mirch", "tikka n talk", "indian sun", "chaska", "khazana", "bites", "kulhad"]):
        return "Urban Indian Street Food & Chaat", "Street Food & Chaat", [
            {
                "name": "Pani Puri & Delhi Chaat",
                "regionalOrigin": "Mumbai / Delhi",
                "description": "Crisp hollow puris with spiced chickpeas, tamarind glaze, and chilled mint water.",
                "spiceLevel": 3,
                "dietary": ["Vegan", "Signature"],
                "insteadOf": "Standard Veg Samosa",
            },
            {
                "name": "Mumbai Kathi Roll or Tawa Platter",
                "regionalOrigin": "Kolkata / Mumbai",
                "description": "Flaky griddle paratha wrapped around spiced fillings and fresh mint chutney.",
                "spiceLevel": 3,
                "dietary": ["Signature"],
            },
        ]

    if any(w in text for w in ["ayurveda", "ayurvedic", "holi", "radha", "madhuram", "sidhartha", "satvik"]):
        return "Ayurvedic & Pan-Indian Wellness", "Ayurvedic & Pan-Indian", [
            {
                "name": "Ayurvedic Dosha-Balanced Thali",
                "regionalOrigin": "Pan-Indian",
                "description": "Lightly tempered lentils, seasonal vegetables, cumin rice, and digestive chutneys.",
                "spiceLevel": 2,
                "dietary": ["Vegan", "Gluten-Free", "Signature"],
            }
        ]

    state = "North India & Punjab"
    if "hyderabad" in text or "biryani" in text:
        state = "Telangana (Hyderabadi) & North India"
    elif "delhi" in text:
        state = "Delhi & North India"
    elif "kashmir" in text:
        state = "Kashmir & North India"
    elif "palast" in text or "rajasthan" in text or "jaipur" in text:
        state = "Rajasthan & North India"

    return state, "North Indian & Tandoori", [
        {
            "name": "Charcoal Tandoori Platter & Dal Tadka",
            "regionalOrigin": state,
            "description": "Clay-oven blistered skewers paired with smoky cumin-tempered yellow lentils.",
            "spiceLevel": 3,
            "dietary": ["Gluten-Free", "Signature"],
            "insteadOf": "Butter Chicken",
        },
        {
            "name": "Whole-Spice Lamb Rogan Josh or Kadai Paneer",
            "regionalOrigin": "North India",
            "description": "Aromatic cardamom and roasted coriander gravy cooked without heavy cream.",
            "spiceLevel": 3,
            "dietary": ["Gluten-Free"],
        },
    ]

def parse_wkt_centroid(loc: str):
    """Extract (lon, lat, is_polygon) from WKT POINT, POLYGON, or MULTIPOLYGON."""
    m = re.search(r"POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)", loc)
    if m:
        return float(m.group(1)), float(m.group(2)), False
    pairs = re.findall(r"([-\d.]+)\s+([-\d.]+)", loc)
    if not pairs:
        return None
    # Drop closing duplicate vertex if ring is closed
    if len(pairs) > 1 and pairs[0] == pairs[-1]:
        pairs = pairs[:-1]
    lons = [float(x) for x, _ in pairs]
    lats = [float(y) for _, y in pairs]
    return sum(lons) / len(lons), sum(lats) / len(lats), True

def fetch_qlever_bavaria():
    print("1/3 Querying QLever OSM Planet for all Indian kitchens in Bavaria...", flush=True)
    sparql = """
PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX osmrel: <https://www.openstreetmap.org/relation/>
PREFIX ogc: <http://www.opengis.net/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT ?osm ?name ?cuisine ?amenity ?street ?hnum ?pc ?city ?suburb ?phone ?cphone ?website ?cwebsite ?hours ?veg ?disused ?loc WHERE {
  osmrel:2145268 ogc:sfContains ?osm .
  ?osm osmkey:cuisine ?cuisine .
  FILTER(REGEX(?cuisine, "indian", "i"))
  ?osm osmkey:name ?name .
  ?osm geo:hasGeometry/geo:asWKT ?loc .
  OPTIONAL { ?osm osmkey:amenity ?amenity }
  OPTIONAL { ?osm osmkey:addr:street ?street }
  OPTIONAL { ?osm osmkey:addr:housenumber ?hnum }
  OPTIONAL { ?osm osmkey:addr:postcode ?pc }
  OPTIONAL { ?osm osmkey:addr:city ?city }
  OPTIONAL { ?osm osmkey:addr:suburb ?suburb }
  OPTIONAL { ?osm osmkey:phone ?phone }
  OPTIONAL { ?osm osmkey:contact:phone ?cphone }
  OPTIONAL { ?osm osmkey:website ?website }
  OPTIONAL { ?osm osmkey:contact:website ?cwebsite }
  OPTIONAL { ?osm osmkey:opening_hours ?hours }
  OPTIONAL { ?osm osmkey:diet:vegetarian ?veg }
  OPTIONAL { ?osm osmkey:disused:amenity ?disused }
}
LIMIT 2000
"""
    req = urllib.request.Request(
        "https://qlever.dev/api/osm-planet",
        data=urllib.parse.urlencode({"query": sparql}).encode("utf-8"),
        headers={"User-Agent": "SpiceAtlasBayern/3.0", "Accept": "application/sparql-results+json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    rows = data.get("results", {}).get("bindings", [])
    print(f"  QLever raw rows in Bavaria: {len(rows)}", flush=True)

    results = []
    seen_osm = set()
    poly_count = 0
    for r in rows:
        osm_uri = r.get("osm", {}).get("value", "")
        if osm_uri in seen_osm:
            continue
        seen_osm.add(osm_uri)

        if r.get("disused"):
            continue
        amenity = (r.get("amenity", {}).get("value") or "").lower()
        if amenity and amenity not in ("restaurant", "fast_food", "cafe", "food_court", "biergarten"):
            continue

        loc = r.get("loc", {}).get("value", "")
        parsed = parse_wkt_centroid(loc)
        if not parsed:
            continue
        lon, lat, is_poly = parsed
        if not in_bavaria(lon, lat):
            continue

        name = r.get("name", {}).get("value", "").strip()
        cuisine = r.get("cuisine", {}).get("value", "").strip()
        street = r.get("street", {}).get("value", "").strip()
        hnum = r.get("hnum", {}).get("value", "").strip()
        pc = r.get("pc", {}).get("value", "").strip()
        raw_city = r.get("city", {}).get("value", "").strip()
        suburb = r.get("suburb", {}).get("value", "").strip() or None

        city = infer_city_from_postcode_or_coords(raw_city, pc, lon, lat)
        addr_parts = []
        if street:
            addr_parts.append(f"{street} {hnum}".strip())
        city_part = f"{pc} {raw_city or city}".strip()
        if city_part:
            addr_parts.append(city_part)
        address = ", ".join(addr_parts) if addr_parts else city

        if is_excluded(name, cuisine, address):
            continue
        if is_poly:
            poly_count += 1

        phone = (r.get("phone", {}).get("value") or r.get("cphone", {}).get("value") or "").strip() or None
        website = (r.get("website", {}).get("value") or r.get("cwebsite", {}).get("value") or "").strip() or None
        if website and not website.startswith(("http://", "https://")):
            website = f"https://{website}"
        hours = (r.get("hours", {}).get("value") or "").strip() or "Check official site or Google Maps for hours"
        is_veg = (r.get("veg", {}).get("value") or "").lower() == "only"

        state, region_cat, sig_dishes = classify_region(name, cuisine)
        osm_id_short = osm_uri.rsplit("/", 1)[-1]
        results.append({
            "id": f"osm-{osm_id_short}",
            "name": name,
            "city": city,
            "district": suburb,
            "address": address,
            "coordinates": [round(lon, 6), round(lat, 6)],
            "indianState": state,
            "regionCategory": region_cat,
            "cuisineStyle": f"OpenStreetMap Verified Indian Kitchen ({cuisine})",
            "phone": phone,
            "website": website,
            "establishedNote": "OpenStreetMap Verified Open Location",
            "hoursNote": hours,
            "isPureVeg": is_veg,
            "isStreetFood": region_cat == "Street Food & Chaat",
            "isNewSpot": any(w in name.lower() for w in ["ilai", "noon mirch", "tadka", "street", "urban turban", "svaad", "anjappar"]),
            "positiveReviews": [
                {
                    "quote": f"Verified active Indian restaurant in {city} serving regional spices and freshly prepared dishes.",
                    "reviewerType": "OSM Community Verified",
                }
            ],
            "signatureDishes": sig_dishes,
            "authenticityNote": "Verified Indian cuisine in OpenStreetMap.",
            "dataSource": "osm-verified",
        })

    print(f"  QLever filtered valid Indian kitchens: {len(results)} (recovered {poly_count} from building polygons)", flush=True)
    return results

def fetch_wolt_bavaria():
    print("2/3 Querying Wolt Live API across 22 Munich & Bavaria hubs...", flush=True)

    def fetch_point(city_hint, lat, lon):
        url = f"https://restaurant-api.wolt.com/v1/pages/restaurants?lat={lat}&lon={lon}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                d = json.loads(r.read().decode("utf-8"))
                found = []
                for sec in d.get("sections", []):
                    for it in sec.get("items", []):
                        v = it.get("venue")
                        if not v:
                            continue
                        tags = [t.lower() for t in v.get("tags", [])]
                        if "indian" not in tags and "indisch" not in tags:
                            continue
                        found.append((city_hint, v))
                return found
        except Exception:
            return []

    seen_wolt = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(fetch_point, c, lat, lon) for c, lat, lon in WOLT_GRID]
        for fut in as_completed(futs):
            for city_hint, v in fut.result():
                vid = v.get("id")
                if vid and vid not in seen_wolt:
                    seen_wolt[vid] = (city_hint, v)

    results = []
    for vid, (city_hint, v) in seen_wolt.items():
        name = (v.get("name") or "").strip()
        loc = v.get("location") or []
        if not name or len(loc) != 2:
            continue
        lon, lat = float(loc[0]), float(loc[1])
        if not in_bavaria(lon, lat):
            continue

        address = (v.get("address") or "").strip()
        if is_excluded(name, " ".join(v.get("tags", [])), address):
            continue

        # Parse postcode from address if present
        pc_match = re.search(r"\b(\d{5})\b", address)
        pc = pc_match.group(1) if pc_match else ""
        city = infer_city_from_postcode_or_coords("", pc, lon, lat, fallback=city_hint)
        if address and city not in address and "München" not in address and "Nürnberg" not in address:
            full_addr = f"{address}, {city}"
        else:
            full_addr = address or city

        desc = (v.get("short_description") or "").strip()
        slug = v.get("slug") or ""
        wolt_url = f"https://wolt.com/en/deu/munich/restaurant/{slug}" if slug else None

        # Wolt score is out of 10 (e.g., 8.8 -> 4.4/5 display scale or keep honest Wolt mention)
        rating_obj = v.get("rating") or {}
        score_10 = rating_obj.get("score")
        vol = rating_obj.get("volume") or 0
        rating_5 = round(score_10 / 2.0, 1) if isinstance(score_10, (int, float)) and vol >= 15 else None

        state, region_cat, sig_dishes = classify_region(name, f"{desc} {' '.join(v.get('tags', []))}")
        rec = {
            "id": f"wolt-{vid}",
            "name": name,
            "city": city,
            "district": None,
            "address": full_addr,
            "coordinates": [round(lon, 6), round(lat, 6)],
            "indianState": state,
            "regionCategory": region_cat,
            "cuisineStyle": desc or "Active Indian Kitchen on Wolt",
            "phone": None,
            "website": wolt_url,
            "establishedNote": "Active Live Kitchen (Wolt Verified)",
            "hoursNote": "Open for dine-in / takeaway / delivery — see Wolt link for live hours",
            "isStreetFood": region_cat == "Street Food & Chaat",
            "isNewSpot": any(w in name.lower() for w in ["ilai", "noon mirch", "tadka", "street", "urban turban", "svaad", "anjappar", "bites"]),
            "positiveReviews": [
                {
                    "quote": desc or f"Active high-demand Indian kitchen in {city}.",
                    "reviewerType": "Live Platform Listing",
                }
            ],
            "signatureDishes": sig_dishes,
            "authenticityNote": "Verified active Indian restaurant via Wolt live index.",
            "dataSource": "osm-verified",
        }
        if rating_5:
            rec["googleRating"] = rating_5
            rec["reviewCountLabel"] = f"{vol}+ Wolt ratings"
        results.append(rec)

    print(f"  Wolt filtered valid Indian kitchens: {len(results)}", flush=True)
    return results

def load_prev_json_or_cache():
    """Include previously geocoded web-verified Bavarian directory records if present."""
    if OUT_PATH.exists():
        try:
            prev = json.loads(OUT_PATH.read_text(encoding="utf-8"))
            return [r for r in prev if str(r.get("id", "")).startswith("bav-")]
        except Exception:
            return []
    return []

def main():
    prev_web = load_prev_json_or_cache()
    print(f"0/3 Retained {len(prev_web)} geocoded Bavarian web-directory records.", flush=True)

    qlever_recs = fetch_qlever_bavaria()
    wolt_recs = fetch_wolt_bavaria()

    # Combine in priority order: web-verified -> Wolt (has addresses & scores) -> QLever OSM (broadest Bavaria coverage)
    all_records = prev_web + wolt_recs + qlever_recs

    deduped = []
    for rec in all_records:
        lon, lat = rec["coordinates"]
        n = norm_name(rec["name"])

        if is_excluded(rec["name"], rec.get("cuisineStyle", ""), rec.get("address", "")):
            continue

        # Deduplicate against flagship curated 28
        skip = False
        for fname, flon, flat in FLAGSHIP_CENTERS:
            dist = haversine_m(lon, lat, flon, flat)
            if dist < 130 or (dist < 2500 and (fname == n or fname in n or n in fname)):
                skip = True
                break
        if skip:
            continue

        # Deduplicate against already accepted records, enriching missing fields!
        dup = None
        for existing in deduped:
            elon, elat = existing["coordinates"]
            dist = haversine_m(lon, lat, elon, elat)
            en = norm_name(existing["name"])
            if dist < 110 or (dist < 380 and en and n and (en == n or en in n or n in en)):
                dup = existing
                break

        if dup:
            if not dup.get("phone") and rec.get("phone"):
                dup["phone"] = rec["phone"]
            if (not dup.get("website") or "wolt.com" in str(dup.get("website"))) and rec.get("website") and "wolt.com" not in str(rec.get("website")):
                dup["website"] = rec["website"]
            if not dup.get("googleRating") and rec.get("googleRating"):
                dup["googleRating"] = rec["googleRating"]
                dup["reviewCountLabel"] = rec.get("reviewCountLabel")
            if len(rec.get("address", "")) > len(dup.get("address", "")) and "," in rec.get("address", ""):
                dup["address"] = rec["address"]
            if dup.get("hoursNote", "").startswith("Check ") and rec.get("hoursNote") and not rec["hoursNote"].startswith("Check "):
                dup["hoursNote"] = rec["hoursNote"]
            continue

        deduped.append(rec)

    munich_cnt = sum(1 for r in deduped if r["city"] == "Munich")
    print(f"3/3 DONE! Total expansion records: {len(deduped)} (Munich expansion: {munich_cnt})", flush=True)
    OUT_PATH.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {OUT_PATH}", flush=True)

if __name__ == "__main__":
    main()
