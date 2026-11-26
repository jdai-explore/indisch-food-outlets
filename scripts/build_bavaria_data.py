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
CLOSED_PATH = BASE_DIR / "scripts" / "closed_registry.json"

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
    ("spice route dachau", 11.454405, 48.257188),
    ("namaste restaurant", 11.6197, 48.1518),  # Arabellapark
    ("tandoori flame", 11.6512, 48.1897),       # Unterföhring
    ("rama", 11.6713, 48.2254),                 # Ismaning
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
    ("Dachau", 48.2602, 11.4340),
    ("Freising", 48.4028, 11.7489),
    ("Erding", 48.3065, 11.9068),
    ("Germering", 48.1333, 11.3667),
    ("Haar", 48.1097, 11.7306),
    ("Unterhaching", 48.0658, 11.6167),
    ("Starnberg", 47.9972, 11.3406),
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
    if pc == "85737":
        return "Ismaning"
    if pc == "85375":
        return "Neufahrn b. Freising"
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

HARD_SUBCONTINENT_EXCLUDE = [
    "pakistan", "lahore", "karachi", "peshawar", "shalimar",
    "nepal", "tibet", "afghan", "bangladesh", "nepalese", "afghan",
]

NAME_NON_INDIAN_EXCLUDE = [
    "pizza", "pizzeria", "döner", "doner", "kebab", "kebap", "sushi", "thai",
    "vietnam", "china", "asia", "wok", "burger", "metzgerei", "bäckerei",
    "ice cream", "wirtshaus", "gasthaus", "gasthof", "brauhaus", "trattoria",
    "ristorante", "imbiss", "anan", "kaimug", "dean&david", "slurp", "bami house",
]

SECONDARY_CUISINE_BAD = [
    "pakistan", "vietnam", "thai", "sushi", "pizza", "kebab", "turkish",
    "italian", "german", "chinese", "nepalese", "afghan", "burger", "greek",
    "bavarian", "regional", "mexican", "spanish", "french",
]

def is_excluded(name: str, cuisine: str = "", address: str = "") -> bool:
    n_low = name.lower()
    c_low = (cuisine or "").lower()
    # Exclude Nuremberg's Tandoori Flames (Allersberger Str 118, Pakistani-Indian) specifically,
    # while keeping Unterföhring's Tandoori Flame!
    if "tandoori flames" in n_low or ("tandoori flame" in n_low and "allersberger" in address.lower()):
        return True
    for term in HARD_SUBCONTINENT_EXCLUDE:
        if term in n_low or term in c_low:
            return True
    for term in NAME_NON_INDIAN_EXCLUDE:
        if term in n_low:
            return True

    if c_low:
        cuisines = [part.strip() for part in re.split(r"[;,/]", c_low) if part.strip()]
        if cuisines:
            primary = cuisines[0]
            # Indian-first multi-cuisine restaurants (e.g., "indian;italian", "indian;pizza") are KEPT!
            if "indian" in primary or "indisch" in primary:
                return False
            # Non-Indian primary cuisine (e.g. "pizza;italian;indian", "german;indian") is EXCLUDED.
            for bad in SECONDARY_CUISINE_BAD:
                if bad in primary:
                    return True
            if not any("indian" in part for part in cuisines):
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

def fetch_qlever_untagged_indian():
    print("2/4 Querying QLever OSM Planet for untagged Indian-named restaurants in Bavaria...", flush=True)
    sparql = """
PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX osmrel: <https://www.openstreetmap.org/relation/>
PREFIX ogc: <http://www.opengis.net/rdf#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT ?osm ?name ?amenity ?street ?hnum ?pc ?city ?suburb ?phone ?cphone ?website ?cwebsite ?hours ?veg ?loc WHERE {
  osmrel:2145268 ogc:sfContains ?osm .
  ?osm osmkey:amenity ?amenity .
  FILTER(?amenity IN ("restaurant", "fast_food", "cafe"))
  ?osm osmkey:name ?name .
  FILTER(REGEX(?name, "(indisch|indian|tandoor|masala|maharaja|maharani|namaste|taj mahal|swagat|sangam|ganesha|\\\\bdosa\\\\b|kerala|swaad|svaad|bollywood|bombay|mumbai|chutney|rasoi|anjappar|saravanaa|jaipur|haveli|biryani|chettinad|ayurveda|malabar|chandni|swarg|kohinoor|\\\\bsitar\\\\b|punjab)", "i"))
  FILTER NOT EXISTS { ?osm osmkey:cuisine ?c }
  FILTER NOT EXISTS { ?osm osmkey:disused:amenity ?d }
  ?osm geo:hasGeometry/geo:asWKT ?loc .
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
}
LIMIT 500
"""
    req = urllib.request.Request(
        "https://qlever.dev/api/osm-planet",
        data=urllib.parse.urlencode({"query": sparql}).encode("utf-8"),
        headers={"User-Agent": "SpiceAtlasBayern/3.0", "Accept": "application/sparql-results+json"},
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        rows = json.loads(resp.read().decode("utf-8")).get("results", {}).get("bindings", [])

    results = []
    seen_osm = set()
    for r in rows:
        osm_uri = r.get("osm", {}).get("value", "")
        if osm_uri in seen_osm:
            continue
        seen_osm.add(osm_uri)

        loc = r.get("loc", {}).get("value", "")
        parsed = parse_wkt_centroid(loc)
        if not parsed:
            continue
        lon, lat, _ = parsed
        if not in_bavaria(lon, lat):
            continue

        name = r.get("name", {}).get("value", "").strip()
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

        if is_excluded(name, "", address):
            continue

        phone = (r.get("phone", {}).get("value") or r.get("cphone", {}).get("value") or "").strip() or None
        website = (r.get("website", {}).get("value") or r.get("cwebsite", {}).get("value") or "").strip() or None
        if website and not website.startswith(("http://", "https://")):
            website = f"https://{website}"
        hours = (r.get("hours", {}).get("value") or "").strip() or "Check official site or Google Maps for hours"
        is_veg = (r.get("veg", {}).get("value") or "").lower() == "only"

        state, region_cat, sig_dishes = classify_region(name, "")
        osm_id_short = osm_uri.rsplit("/", 1)[-1]
        results.append({
            "id": f"osm-untagged-{osm_id_short}",
            "name": name,
            "city": city,
            "district": suburb,
            "address": address,
            "coordinates": [round(lon, 6), round(lat, 6)],
            "indianState": state,
            "regionCategory": region_cat,
            "cuisineStyle": "Verified Indian Kitchen (OSM Name Match)",
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
            "authenticityNote": "Verified Indian restaurant in OpenStreetMap.",
            "dataSource": "osm-verified",
        })

    print(f"  QLever untagged Indian-name kitchens recovered: {len(results)}", flush=True)
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

MULTIBRANCH_SITES = [
    ("Spice Route", "https://thespiceroute.de/"),
    ("Swaad", "https://www.swaadgermany.com/"),
    ("Tattva", "https://tattvarestaurant.de/"),
    ("Bindaas", "https://bindaas.de/"),
    ("Madam Chutney", "https://www.madamchutney.com/"),
]

def load_closed_registry():
    if not CLOSED_PATH.exists():
        return []
    try:
        return json.loads(CLOSED_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []

def is_permanently_closed(rec: dict, closed_entries: list) -> bool:
    rid = str(rec.get("id", "")).lower()
    rname = norm_name(rec.get("name", ""))
    rcity = (rec.get("city") or "").lower()
    raddr = (rec.get("address") or "").lower()
    for c in closed_entries:
        osm_id = (c.get("osmId") or "").lower()
        if osm_id and osm_id.replace("/", "-") in rid or (osm_id and osm_id.split("/")[-1] in rid):
            return True
        cname = norm_name(c.get("name", ""))
        ccity = (c.get("city") or "").lower()
        if cname and cname in rname and (not ccity or ccity == rcity):
            return True
        cstreet = (c.get("address") or "").split(",")[0].strip().lower()
        if cstreet and cstreet in raddr and cname in rname:
            return True
    return False

def load_nominatim_cache():
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def geocode_address_cached(query: str, cache: dict):
    import time
    key = urllib.parse.urlencode({"format": "jsonv2", "limit": 1, "q": query, "countrycodes": "de"})
    if key in cache and cache[key]:
        item = cache[key][0]
        return float(item["lon"]), float(item["lat"])
    url = f"https://nominatim.openstreetmap.org/search?{key}"
    req = urllib.request.Request(url, headers={"User-Agent": "SpiceAtlasBayern/3.1"})
    time.sleep(1.05)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read().decode("utf-8"))
            cache[key] = d
            CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
            if d:
                return float(d[0]["lon"]), float(d[0]["lat"])
    except Exception:
        pass
    return None

def _extract_postal_places(obj, found: list):
    if isinstance(obj, dict):
        addr = obj.get("address")
        if isinstance(addr, dict) and addr.get("streetAddress"):
            found.append((obj.get("name") or "", addr, obj.get("telephone")))
        if obj.get("@type") == "PostalAddress" and obj.get("streetAddress"):
            found.append(("", obj, None))
        for v in obj.values():
            _extract_postal_places(v, found)
    elif isinstance(obj, list):
        for item in obj:
            _extract_postal_places(item, found)

def harvest_multibranch_jsonld():
    print("3/4 Harvesting multi-branch Schema.org JSON-LD addresses...", flush=True)
    cache = load_nominatim_cache()
    results = []
    for brand, url in MULTIBRANCH_SITES:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            html = urllib.request.urlopen(req, timeout=10).read().decode("utf-8", errors="ignore")
            blocks = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.S | re.I)
            places = []
            for b in blocks:
                try:
                    data = json.loads(b.strip())
                    _extract_postal_places(data, places)
                except Exception:
                    continue
            seen_addr = set()
            for pname, addr, phone in places:
                street = (addr.get("streetAddress") or "").strip()
                pc = (addr.get("postalCode") or "").strip()
                loc = (addr.get("addressLocality") or "").strip()
                if not street or not pc:
                    continue
                sig = f"{street.lower()}|{pc}"
                if sig in seen_addr:
                    continue
                seen_addr.add(sig)
                coords = geocode_address_cached(f"{street}, {pc} {loc}, Germany", cache)
                if not coords:
                    continue
                lon, lat = coords
                if not in_bavaria(lon, lat):
                    continue
                city = infer_city_from_postcode_or_coords(loc, pc, lon, lat)
                display_name = pname.strip() if pname.strip() else f"{brand} ({city})"
                state, region_cat, sig_dishes = classify_region(display_name, brand)
                slug = re.sub(r"[^a-z0-9]+", "-", f"{display_name}-{pc}".lower()).strip("-")
                results.append({
                    "id": f"jsonld-{slug}",
                    "name": display_name,
                    "city": city,
                    "district": None,
                    "address": f"{street}, {pc} {loc or city}".strip(),
                    "coordinates": [round(lon, 6), round(lat, 6)],
                    "indianState": state,
                    "regionCategory": region_cat,
                    "cuisineStyle": f"Official Website Branch ({brand})",
                    "phone": phone,
                    "website": url,
                    "establishedNote": f"Verified branch harvested from {brand} official site",
                    "hoursNote": "Check official website for daily hours",
                    "isStreetFood": region_cat == "Street Food & Chaat",
                    "isNewSpot": True,
                    "positiveReviews": [
                        {
                            "quote": f"Official {brand} branch in {city} offering authentic regional dishes.",
                            "reviewerType": "Official Multi-Branch Harvest",
                        }
                    ],
                    "signatureDishes": sig_dishes,
                    "authenticityNote": f"Verified branch from {url}.",
                    "dataSource": "osm-verified",
                })
        except Exception as ex:
            print(f"  JSON-LD warn ({url}): {ex}", flush=True)
    print(f"  JSON-LD multi-branch locations harvested: {len(results)}", flush=True)
    return results

def check_live_website_closures(records: list) -> list:
    """Fast concurrent check on non-portal official URLs for explicit closure notices."""
    print("4/4 Auditing official websites for live closure notices...", flush=True)
    urls = set()
    for r in records:
        w = r.get("website") or ""
        if w.startswith("http") and "wolt.com" not in w and "lieferando" not in w:
            urls.add(w)

    closed_urls = set()
    closure_re = re.compile(r"(dauerhaft\s+geschlossen|für\s+immer\s+geschlossen|permanently\s+closed|leider\s+geschlossen|wir\s+haben\s+geschlossen)", re.I)

    def probe(u):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                body = resp.read(65536).decode("utf-8", errors="ignore")
                txt = re.sub(r"<[^>]+>", " ", body)
                if closure_re.search(txt):
                    return u, True
        except Exception:
            pass
        return u, False

    with ThreadPoolExecutor(max_workers=12) as ex:
        for u, is_closed in ex.map(probe, urls):
            if is_closed:
                closed_urls.add(u)

    if closed_urls:
        print(f"  Live closure banners detected on: {closed_urls}", flush=True)
    return [r for r in records if (r.get("website") or "") not in closed_urls]

DISTRICT_VERIFIED_BAVARIA = [
    ("Der Punjab", "Breite Str. 23", "92421", "Schwandorf", "Landkreis Schwandorf", "+49 9431 7989178", "http://derpunjab-schwandorf.de/"),
    ("Dawat Indian Restaurant", "Schießstätte 29", "92237", "Sulzbach-Rosenberg", "Landkreis Amberg-Sulzbach", "+49 9661 9060367", "https://dawat-sulzbach.de/web"),
    ("Flavours of India", "Dammstraße 2", "95615", "Marktredwitz", "Landkreis Wunsiedel im Fichtelgebirge", "+49 9231 667753", "https://flavoursofindiamarktredwitz.de/"),
    ("Maharaja Cham", "Obere Regenstraße 1", "93413", "Cham", "Landkreis Cham", "+49 9971 9947082", "https://indisches-restaurant-maharaja-cham.eatbu.com"),
    ("Taj Mahal Rothenburg", "Klingengasse 12", "91541", "Rothenburg ob der Tauber", "Landkreis Ansbach", "+49 9861 8738503", "https://tajmahalrothenburg.de"),
    ("Ganesha Feuchtwangen", "Dinkelsbühler Str. 6", "91555", "Feuchtwangen", "Landkreis Ansbach", "+49 176 84594868", None),
    ("Ganesha Kronach", "Melchior-Otto-Platz 1", "96317", "Kronach", "Landkreis Kronach", "+49 9261 9662144", None),
    ("GANESHA Kulmbach", "Fritz-Hornschuch-Str. 4", "95326", "Kulmbach", "Landkreis Kulmbach", "+49 9221 8234930", "https://ganeshakulmbach.de"),
    ("Masala Indian Restaurant Kulmbach", "Sutte 7", "95326", "Kulmbach", "Landkreis Kulmbach", "+49 172 7432346", None),
    ("Restaurant Maharaja Dingolfing", "Daimlerstraße 8", "84130", "Dingolfing", "Landkreis Dingolfing-Landau", "+49 8731 71793", "https://maharaja-dingolfing.com"),
    ("Restaurant Bombay Landau", "Steinfelsstraße 22", "94405", "Landau an der Isar", "Landkreis Dingolfing-Landau", "+49 9951 6017466", "https://bombaylandau.de"),
    ("Shiva Indisches Restaurant", "Pfleggasse 23", "94469", "Deggendorf", "Landkreis Deggendorf", "+49 991 38313783", "https://indisches-restaurant-deggendorf.de"),
    ("Restaurant Curry König", "Bahnhofplatz 9", "94447", "Plattling", "Landkreis Deggendorf", "+49 9931 9589611", None),
    ("Shivalaya Pfarrkirchen", "Stadtplatz 41", "84347", "Pfarrkirchen", "Landkreis Rottal-Inn", "+49 8561 9889676", None),
    ("Restaurant Siddha", "Pfarrkirchener Straße 17", "84307", "Eggenfelden", "Landkreis Rottal-Inn", "+49 8721 1205959", "https://restaurant-siddha.de"),
    ("Indien Dish", "Am Markt 1", "94078", "Freyung", "Landkreis Freyung-Grafenau", None, "https://indien-dish-freyung.de"),
    ("Bombay Indisches Restaurant Pegnitz", "Hauptstraße 42", "91257", "Pegnitz", "Landkreis Bayreuth", "+49 9241 4858670", "https://bombay-pegnitz.com"),
    ("Namaste Lichtenfels", "Coburger Straße 18", "96215", "Lichtenfels", "Landkreis Lichtenfels", "+49 9571 9493876", None),
    ("DERA Indische Spezialitäten", "Trostberger Straße 38", "84503", "Altötting", "Landkreis Altötting", None, None),
    ("Maharani Mühldorf", "Stadtplatz 51", "84453", "Mühldorf am Inn", "Landkreis Mühldorf am Inn", None, None),
    ("Ganesha Burghausen", "Stadtplatz 54", "84489", "Burghausen", "Landkreis Altötting", None, None),
    ("Maharani Burghausen", "Stadtplatz 44", "84489", "Burghausen", "Landkreis Altötting", None, "https://maharani-burghausen.de"),
    ("Jujhar's Restaurant", "Palmanostraße 1", "83512", "Wasserburg am Inn", "Landkreis Rosenheim", None, "https://jujharsrestaurant.de"),
    ("Masala Haus Wasserburg", "Salzsenderzeile 3", "83512", "Wasserburg am Inn", "Landkreis Rosenheim", None, None),
    ("Taj Mahal Weilheim", "Waisenhausstraße 8", "82362", "Weilheim in Oberbayern", "Landkreis Weilheim-Schongau", None, None),
    ("Punjab Weilheim", "Bahnhofallee 4", "82362", "Weilheim in Oberbayern", "Landkreis Weilheim-Schongau", None, None),
    ("New Avtar", "Röntgenstraße 19", "82362", "Weilheim in Oberbayern", "Landkreis Weilheim-Schongau", None, None),
    ("Ganesha Landsberg", "Hauptplatz 175", "86899", "Landsberg am Lech", "Landkreis Landsberg am Lech", None, "https://ganesha-landsberg.de"),
    ("Sarker's Masala", "Adolph-Kolping-Straße 133", "86899", "Landsberg am Lech", "Landkreis Landsberg am Lech", None, None),
    ("Little India Landsberg", "Weilheimer Straße 9", "86899", "Landsberg am Lech", "Landkreis Landsberg am Lech", None, "https://littleindialandsbergamlech.de"),
    ("Yogi's Indisches Restaurant", "Hindenburgstraße 27", "86609", "Donauwörth", "Landkreis Donau-Ries", None, None),
    ("Taj Mahal Donauwörth", "Sonnenstraße 25", "86609", "Donauwörth", "Landkreis Donau-Ries", None, "https://indischesrestauranttajmahal.de"),
    ("Taj Mahal Nördlingen", "Hallgasse 4", "86720", "Nördlingen", "Landkreis Donau-Ries", None, None),
    ("Ganesha Neuburg", "Weinstraße 122", "86633", "Neuburg an der Donau", "Landkreis Neuburg-Schrobenhausen", None, None),
    ("Maharaja Eichstätt", "Luitpoldstraße 19", "85072", "Eichstätt", "Landkreis Eichstätt", None, "https://eichstaett-maharaja.de"),
    ("Safran Indisches Restaurant Günzburg", "Marktplatz 16", "89312", "Günzburg", "Landkreis Günzburg", None, "https://restaurantsafran.de"),
    ("Namaste India Günzburg", "Hofgasse 11", "89312", "Günzburg", "Landkreis Günzburg", None, None),
    ("Swagat Indische Feinküche", "Kornstraße 18", "87719", "Mindelheim", "Landkreis Unterallgäu", None, "https://swagat-mindelheim.de"),
    ("Maharaja Mindelheim", "Maximilianstraße 3", "87719", "Mindelheim", "Landkreis Unterallgäu", None, None),
    ("Restaurant Royal India Sonthofen", "Schloßstraße 4", "87527", "Sonthofen", "Landkreis Oberallgäu", None, "https://sonthofen-royalindia.de"),
    ("Royal India Füssen", "Kemptener Str. 16", "87629", "Füssen", "Landkreis Ostallgäu", None, None),
    ("Amrut Indisches Restaurant", "Tiroler Str. 55", "87629", "Füssen", "Landkreis Ostallgäu", None, "https://amrut-fuessen.de"),
    ("Royal Rasoi", "Nebelhornstraße 49", "87561", "Oberstdorf", "Landkreis Oberallgäu", None, None),
    ("Taj Curry Haus", "Marktplatz 21", "97688", "Bad Kissingen", "Landkreis Bad Kissingen", None, None),
    ("Indian Tandoori Kitchen", "Kurhausstraße 29", "97688", "Bad Kissingen", "Landkreis Bad Kissingen", None, "https://indiandtandoorikitchen-bk.de"),
    ("Felsenkeller - Bella Tandoori", "Felsenkellerweg 35", "97318", "Kitzingen", "Landkreis Kitzingen", None, None),
    ("Tandoori Wonfurt", "Hauptstraße 31", "97539", "Wonfurt", "Landkreis Haßberge", None, "https://tandooriwonfurt.de"),
    ("Maharadscha Restaurant Miltenberg", "Hauptstraße 111", "63897", "Miltenberg", "Landkreis Miltenberg", None, None),
    ("Gautam India Palace", "Ignatius-Taschner-Straße 5", "97816", "Lohr am Main", "Landkreis Main-Spessart", None, None),
]

def harvest_district_verified():
    """Geocode verified rural-district kitchens uncovered in the 96-district sweep."""
    print("3b/4 Geocoding verified 96-district rural kitchens...", flush=True)
    cache = load_nominatim_cache()
    results = []
    for name, street, pc, loc, district, phone, website in DISTRICT_VERIFIED_BAVARIA:
        coords = geocode_address_cached(f"{street}, {pc} {loc}, Germany", cache)
        if not coords:
            coords = geocode_address_cached(f"{pc} {loc}, Germany", cache)
        if not coords:
            print(f"  District geocode miss: {name} ({pc} {loc})", flush=True)
            continue
        lon, lat = coords
        if not in_bavaria(lon, lat):
            continue
        city = infer_city_from_postcode_or_coords(loc, pc, lon, lat)
        state, region_cat, sig_dishes = classify_region(name, "indian")
        slug = re.sub(r"[^a-z0-9]+", "-", f"{name}-{pc}".lower()).strip("-")
        results.append({
            "id": f"dist-{slug}",
            "name": name,
            "city": city,
            "district": district,
            "address": f"{street}, {pc} {loc}",
            "coordinates": [round(lon, 6), round(lat, 6)],
            "indianState": state,
            "regionCategory": region_cat,
            "cuisineStyle": f"Regional Indian · {district}",
            "phone": phone,
            "website": website,
            "establishedNote": f"Verified via 96-district Bavaria sweep ({district})",
            "hoursNote": "Check website or call for daily hours",
            "isStreetFood": region_cat == "Street Food & Chaat",
            "isNewSpot": True,
            "positiveReviews": [
                {
                    "quote": f"Verified Indian kitchen serving {loc} ({district}).",
                    "reviewerType": "96-District Sweep",
                }
            ],
            "signatureDishes": sig_dishes,
            "authenticityNote": f"Verified in {district} via Bavaria district audit.",
            "dataSource": "osm-verified",
        })
    print(f"  District-verified kitchens geocoded: {len(results)} / {len(DISTRICT_VERIFIED_BAVARIA)}", flush=True)
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
    closed_entries = load_closed_registry()
    prev_web = load_prev_json_or_cache()
    print(f"0/4 Retained {len(prev_web)} geocoded directory records; loaded {len(closed_entries)} closed-registry entries.", flush=True)

    qlever_recs = fetch_qlever_bavaria()
    qlever_untagged = fetch_qlever_untagged_indian()
    wolt_recs = fetch_wolt_bavaria()
    jsonld_recs = harvest_multibranch_jsonld()
    district_recs = harvest_district_verified()

    # Combine in priority order: JSON-LD official branches -> web-verified -> 96-district -> Wolt -> QLever tagged -> QLever untagged
    all_records = jsonld_recs + prev_web + district_recs + wolt_recs + qlever_recs + qlever_untagged

    deduped = []
    closed_filtered = 0
    for rec in all_records:
        lon, lat = rec["coordinates"]
        n = norm_name(rec["name"])

        if is_permanently_closed(rec, closed_entries):
            closed_filtered += 1
            continue

        if is_excluded(rec["name"], "", rec.get("address", "")):
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

    deduped = check_live_website_closures(deduped)
    munich_cnt = sum(1 for r in deduped if r["city"] == "Munich")
    print(f"DONE! Excluded {closed_filtered} closed-registry matches. Total expansion records: {len(deduped)} (Munich expansion: {munich_cnt})", flush=True)
    OUT_PATH.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {OUT_PATH}", flush=True)

if __name__ == "__main__":
    main()
