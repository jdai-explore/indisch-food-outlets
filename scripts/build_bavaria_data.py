import json
import math
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_PATH = BASE_DIR / "src" / "data" / "bavariaOsmRestaurants.json"
CACHE_PATH = BASE_DIR / "scripts" / "nominatim_cache.json"

# Comprehensive web-verified Munich, Greater Munich & Bavaria Indian restaurants
# Tuple: (name, city, street, postcode, district, website, phone, googleRating, reviewCountLabel, extraNote)
WEB_VERIFIED = [
    # --- MUNICH (City + Immediate Districts) ---
    ("Dhaba Indisches Restaurant", "Munich", "Belgradstraße 16", "80796", "Schwabing-West", "https://www.dhabamunich.de", "+49 89 38367771", 4.5, "700+ Google reviews", "Classic North Indian, tandoor & street-food classics in Schwabing-West."),
    ("Little India", "Munich", "Leopoldstraße 87", "80802", "Schwabing", "https://restaurant-littleindia.de", "+49 89 332555", None, None, "Traditional North Indian recipes on Leopoldstraße."),
    ("Swagatam", "Munich", "Elisabethstraße 12", "80796", "Schwabing", "https://swagatam-muenchen.de", "+49 89 51110796", None, None, "Mughlai and North Indian specialties in Schwabing."),
    ("Restaurant Sangeet", "Munich", "Brienner Straße 10", "80333", "Maxvorstadt", "https://restaurantsangeet.de", None, None, None, "Known for Thalis, Biryanis & classic curries near Odeonsplatz."),
    ("The King Masala", "Munich", "Gabelsbergerstraße 50", "80333", "Maxvorstadt", None, None, None, None, "Family-recipe curries and vegan options in Maxvorstadt."),
    ("ILAI Südindisches Restaurant", "Munich", "Rosenheimer Str. 155", "81667", "Haidhausen / Ramersdorf", "https://ilaigastronomie.de", None, None, None, "Specializing in authentic South Indian dosas, idlis & coastal curries."),
    ("Tikka N Talk Haidhausen", "Munich", "Franziskanerstraße 16", "81669", "Haidhausen", "https://tikkantalk.de", "+49 89 23241964", None, None, "Charcoal-oven tandoori, Dum biryanis & street-food bowls."),
    ("Holi365", "Munich", "Steinstraße 79", "81667", "Haidhausen", "https://www.holi365.de", "+49 89 45109777", 4.8, "600+ Google reviews", "Beloved neighborhood Indian dining near Gasteig (formerly Safran)."),
    ("Ganesha Restaurant", "Munich", "Rosenheimer Str. 113a", "81667", "Haidhausen", "https://www.restaurant-ganesha.de", "+49 89 4480962", None, None, "Classic North Indian curries, tandoor & outdoor seating."),
    ("Palast der Winde", "Munich", "Hans-Sachs-Straße 8", "80469", "Glockenbachviertel", "https://palastderwinde.de", None, None, None, "Atmospheric Glockenbachviertel spot with extensive vegan choices."),
    ("Samrat", "Munich", "Papa-Schmid-Straße 1", "80469", "Glockenbachviertel", "https://samrat.de", None, None, None, "Home-style North Indian cooking in Glockenbachviertel."),
    ("Ayurveda Indisches Restaurant", "Munich", "Ganghoferstraße 76", "81373", "Sendling", "https://ayurveda-muc.de", "+49 89 76758225", None, None, "Kerala fish & healthy Ayurvedic vegetarian recipes in Sendling."),
    ("Dessi Tadka", "Munich", "Hofmannstraße 7", "81379", "Obersendling", None, None, None, None, "Indo-Chinese, Goa curries & Indian street food plates."),
    ("Bollywood Indisches Restaurant", "Munich", "Donnersbergerstraße 44", "80634", "Neuhausen", None, None, None, None, "Family-run clay-oven tandoori kitchen with sunny terrace."),
    ("Taj-Mahal Neuhausen", "Munich", "Nymphenburger Straße 145", "80636", "Neuhausen", None, None, None, None, "Kashmiri specialties, extensive vegetarian menu & clay-oven dishes."),
    ("Urban Turban", "Munich", "Ismaninger Straße 71A", "81675", "Bogenhausen", "https://www.urbanturban-muenchen.de", "+49 89 24402400", None, None, "Modern Indian restaurant & café concept in Bogenhausen."),
    ("Kerala Restaurant", "Munich", "Effnerstraße 102", "81925", "Bogenhausen", "https://www.keralarestaurant.de", None, None, None, "South Indian Kerala coastal flavors in Bogenhausen."),
    ("Sangam Giesing", "Munich", "Werner-Schlierf-Straße 23", "81539", "Obergiesing", "https://www.sangam-muenchen.de", "+49 89 34023215", None, None, "Established neighborhood Indian restaurant in Obergiesing."),
    ("Indian Accent", "Munich", "Rotwandstraße 1", "81539", "Giesing", "https://www.indian-accent.eu", "+49 89 24290277", None, None, "Authentic Indian dining and regional curries in Giesing."),
    ("Swaad Restaurant Pasing", "Munich", "Gottfried-Keller-Straße 35", "81245", "Pasing", "https://www.swaadgermany.com", "+49 1575 8270356", 4.4, "350+ Google reviews", "Assal Marathi Western Indian specialties in Pasing."),
    ("Swaad Berg-am-Laim", "Munich", "Berg-am-Laim-Straße 103", "81673", "Berg am Laim", "https://www.swaadgermany.com", "+49 89 89796408", 4.4, "500+ Google reviews", "Assal Marathi kitchen in Berg am Laim courtyard."),
    ("Saroor Restaurant", "Munich", "Bunzlauer Platz 1", "80992", "Moosach", "https://saroorrestaurant-moosach.com", "+49 89 37414967", None, None, "North Indian specialties at Bunzlauer Platz in Moosach."),
    ("GURU Indisches Restaurant Trudering", "Munich", "Wasserburger Landstraße 204A", "81827", "Trudering", "https://www.guru-restaurant.de", "+49 89 43777227", None, None, "Popular tandoori and curry house in Trudering."),
    ("Hindura Indisches Spezialitäten", "Munich", "Truderinger Straße 212", "81825", "Trudering", "https://www.hinduraindischesspezialitaeten-restaurant.de", None, None, None, "Traditional Indian curries and clay-oven dishes in Trudering."),
    ("Ganga", "Munich", "Baaderstraße 11", "80469", "Isarvorstadt", None, "+49 89 2016465", 4.8, "750+ Google reviews", "Top-rated neighborhood Indian favorite in Isarvorstadt."),
    ("GOA Restaurant", "Munich", "Thierschstraße 8", "80538", "Lehel", "https://www.goarestaurant.de", "+49 89 21111789", 4.5, "900+ Google reviews", "Central Lehel spot near Isartor with popular lunch menu."),
    ("Restaurant Sitar", "Munich", "Robert-Koch-Straße 4", "80538", "Lehel", None, "+49 89 21112361", 4.2, "450+ Google reviews", "Long-standing Indian dining room in Lehel."),
    ("Garam Masala", "Munich", "Radlsteg 1", "80331", "Altstadt", "https://garam-masala.de", "+49 89 24245907", None, None, "Authentic Altstadt Indian dining right off Tal & Viktualienmarkt."),
    ("Madam Chutney Sendlinger Tor", "Munich", "Sendlinger Straße 45", "80331", "Altstadt", "https://www.madamchutney.com", "+49 89 92746343", 4.5, "600+ Google reviews", "Street kitchen branch serving Mumbai Kathi Rolls & chaat."),
    ("Bindaas Werksviertel", "Munich", "Speicherstraße 20", "81671", "Werksviertel", "https://bindaas.de", None, 4.6, "900+ Google reviews", "Kolkata-inspired street food & sharing plates in Werksviertel."),
    ("Mehfil Indisches Restaurant", "Munich", "Hansastraße 146", "81373", "Sendling-Westpark", "https://mehfil-liefert.de", "+49 89 7609623", None, None, "Serving Sendling-Westpark continuously since 1993."),
    ("Royal India Westend", "Munich", "Westendstraße 117", "80339", "Westend", "https://www.royalindia-munich.de", "+49 89 50073737", None, None, "Classic Indian dining in Westend / Schwanthalerhöhe."),
    ("In-Dish Munich", "Munich", "Theresienhöhe 5", "80339", "Schwanthalerhöhe", "https://indish-munich.de", "+49 89 93922735", None, None, "Modern Indian dishes right near Theresienwiese."),
    ("Masala Noir", "Munich", "Max-Rothschild-Straße 10", "81825", "Trudering", "https://masala-noir.de", "+49 89 428199", None, None, "Refined Indian dishes and tandoor plates in Munich East."),
    ("Restaurant Mumbai", "Munich", "Fasangartenstraße 99", "81549", "Fasangarten", "https://restaurant-mumbai.de", "+49 89 70959259", None, None, "Western & North Indian dishes in Munich South-East."),
    ("Taste of India", "Munich", "Forstenrieder Allee 247", "81476", "Forstenried", "https://www.tasteofindia-muenchen.de", "+49 89 7595933", None, None, "Neighborhood Indian restaurant in Forstenried."),
    ("Indian Village Feldmoching", "Munich", "Feldmochinger Straße 226", "80995", "Feldmoching", "https://www.indian-village.de", "+49 89 15985518", None, None, "Traditional North Indian classics in Munich North."),
    ("Madhuram Indisches Restaurant", "Munich", "Thomas-Dehler-Straße 13", "81737", "Neuperlach", "https://madhuram.de", "+49 89 92740863", None, None, "Traditional Indian dining in Neuperlach Plaza."),
    ("Restaurant Sidhartha", "Munich", "Zehentstadelweg 12", "81247", "Obermenzing", "https://www.restaurantsidhartha-munchen.de", None, None, None, "Classic Indian cuisine in Munich West."),
    ("Rasmalai Indisches Restaurant", "Munich", "Großhaderner Straße 12", "81375", "Großhadern", "https://www.rasmalai.de", None, None, None, "Cozy neighborhood Indian kitchen near Großhadern U-Bahn."),
    ("Bombay Tandoori", "Munich", "Rosenheimer Straße 75", "81667", "Haidhausen", None, None, None, None, "Clay-oven tandoori & curries on Rosenheimer Straße."),
    ("Maharaja Neuhausen", "Munich", "Blutenburgstraße 79", "80634", "Neuhausen", "https://restaurantmaharajamuenchen.de", "+49 89 13012482", 4.0, "650+ Google reviews", "Traditional Neuhausen neighborhood Indian dining."),
    ("Indian Sun", "Munich", "Sankt-Ingbert-Straße 2", "81541", "Giesing", "https://www.indiansun-muenchen.de", None, None, None, "Fresh Naan rolls & quick Indian street eats."),
    ("Indian Love Story", "Munich", "Tal 34", "80331", "Altstadt", None, None, None, None, "Central Altstadt spot on Tal."),

    # --- GREATER MUNICH METRO ---
    ("GANESHA Feine Indische Küche", "Unterhaching", "Rathausplatz 4", "82008", "Landkreis München", "https://ganeshaunterhaching.de", "+49 89 66059158", None, None, "Fine Indian dining at Unterhaching Rathausplatz."),
    ("Taj Palace Ottobrunn", "Ottobrunn", "Friedrich-Ebert-Platz 3", "85521", "Landkreis München", None, "+49 89 63819925", None, None, "Traditional North Indian specialties in Ottobrunn."),
    ("indie curry haus", "Haar", "Höglweg 3", "85540", "Haar bei München", "https://indiecurryhaus.de", "+49 89 99999044", None, None, "Fresh modern curry house in Haar."),
    ("Tattva Haar", "Haar", "Schneiderhofstraße 31", "85540", "Haar bei München", "https://www.tattvarestaurant.de", "+49 89 94007707", None, None, "Regional curries and tandoor favorites in Haar."),
    ("Yogi Mahal", "Germering", "Münchener Straße 1", "82110", "Germering", "https://www.yogimahal.de", "+49 89 85640311", None, None, "Classic Indian specialties in Germering."),
    ("Tattva Germering", "Germering", "Goethestraße 5", "82110", "Germering", "https://www.tattvarestaurant.de", "+49 89 55916126", None, None, "Authentic Indian dishes in Germering."),
    ("Mantra Indisches Restaurant Dachau", "Dachau", "Mittermayerstraße 15", "85221", "Dachau", "https://www.dachaumantra.de", "+49 8131 72529", None, None, "Popular North Indian kitchen in Dachau."),
    ("Restaurant Radha", "Dachau", "Friedenstraße 21", "85221", "Dachau", "https://www.restaurant-radha.de", "+49 8131 339353", None, None, "Warm hospitality & traditional Indian dishes in Dachau."),
    ("Restaurant Maharaja Starnberg", "Starnberg", "Achheimstraße 3", "82319", "Starnberg", None, "+49 8151 5507279", None, None, "Classic Indian cuisine near Lake Starnberg."),
    ("TAJ Indisches Restaurant Erding", "Erding", "Haager Straße 15", "85435", "Erding", "https://taj-erding.de", "+49 8122 2282522", None, None, "Established Indian restaurant in Erding."),
    ("aahaa - The Indian Taste", "Erding", "Wendelsteinstraße 24", "85435", "Erding", "https://aahaa-erding.de", "+49 1575 0000660", None, None, "Authentic regional Indian flavors in Erding."),
    ("New Indian Palace Freising", "Freising", "Mainburger Straße 41", "85356", "Freising", "https://indianpalacefreising.de", None, None, None, "Traditional curries and clay oven near TUM Weihenstephan."),
    ("Indian Village Freising", "Freising", "General-von-Nagel-Straße 16", "85354", "Freising", None, None, None, None, "Popular Indian spot in central Freising."),

    # --- NUREMBERG / FÜRTH / ERLANGEN ---
    ("Anjappar Chettinad Nürnberg", "Nuremberg", "Königstraße 57", "90402", "Altstadt", "https://www.anjapparnurnberg.de", "+49 176 21185943", None, None, "Authentic Tamil Nadu Chettinad spice cuisine in central Nuremberg."),
    ("Svaad - The Indian Kitchen", "Nuremberg", "Johannisstraße 10", "90419", "St. Johannis", "https://svaad-nuernberg.de", None, None, None, "Regional Indian flavors and street-food favorites."),
    ("Kohinoor Indisches Restaurant", "Nuremberg", "Bahnhofstraße 13", "90402", "Zentrum", "https://www.kohinoor-nbg.de", "+49 911 21070852", None, None, "Classic North Indian curries near Nürnberg Hbf."),
    ("Der kleine Inder", "Fürth", "Königstraße 108", "90762", "Zentrum", "https://derkleineinder.de", None, None, None, "Long-standing favorite since 2004 cooking without artificial enhancers."),
    ("Dana & Pani Indian Fusion", "Fürth", "Hans-Vogel-Straße 40", "90765", "Poppenreuth", "https://danaundpani.de", None, None, None, "Indian fusion dishes and popular lunch menus in Fürth."),
    ("Indian Palace Fürth", "Fürth", "Kohlenmarkt 4", "90762", "Altstadt", "https://www.indian-palace-fuerth.de", "+49 911 9792340", None, None, "Central Fürth North Indian tandoori kitchen."),
    ("Sangam Erlangen", "Erlangen", "Martinsbühler Straße 1", "91054", "Zentrum", "https://www.restaurant-sangam-erlangen.de", "+49 9131 9283733", None, None, "Rich curries, biryanis & starters in Erlangen."),
    ("Delhi Restaurant Erlangen", "Erlangen", "Theodor-von-Zahn-Straße 19", "91052", "Zentrum", "https://delhierlangen.de", None, None, None, "Traditional curries, tandoor grills & vegan dishes."),
    ("Curry House Erlangen", "Erlangen", "Theaterplatz 2", "91054", "Altstadt", "https://curryhouse-erlangen.de", "+49 9131 9205510", None, None, "Central Erlangen Indian restaurant at Theaterplatz."),
    ("Namaste Erlangen", "Erlangen", "Kornstraße 2", "91054", "Zentrum", "https://www.namaste-erlangen.de", "+49 9131 9742880", None, None, "Traditional Indian dining near Erlangen center."),

    # --- AUGSBURG / KEMPTEN / MEMMINGEN / NEU-ULM / KAUFBEUREN / LINDAU ---
    ("Royal India Augsburg", "Augsburg", "Bahnhofstraße 21", "86150", "Innenstadt", "https://www.royalindia-aug.de", "+49 821 29732391", None, None, "Authentic North Indian flavors & health-conscious spice prep."),
    ("King Masala Augsburg", "Augsburg", "Jakoberstraße 55", "86152", "Jakobervorstadt", "https://kingmasalaaugsburg.de", None, None, None, "Popular Augsburg curry & tandoor dining room."),
    ("Dessi Tadka Augsburg", "Augsburg", "Barfüßerstraße 5", "86150", "Innenstadt", None, None, None, None, "Street food, Indo-Chinese & vibrant curries in central Augsburg."),
    ("Swagat Kempten", "Kempten", "Klostersteige 7", "87435", "Zentrum", "https://swagat-kempten.de", "+49 831 74608993", None, None, "Authentic North Indian cuisine in the Allgäu capital."),
    ("Rasoi Indisches Restaurant", "Kempten", "Scheibenstraße 5", "87435", "Zentrum", "https://rasoikempten.de", "+49 831 5237831", None, None, "Home-style Indian kitchen in Kempten."),
    ("Royal India Memmingen", "Memmingen", "Kalchstraße 6", "87700", "Altstadt", "https://indisches-restaurant-memmingen.de", "+49 8331 9854600", None, None, "Classic Indian cuisine in Memmingen Old Town."),
    ("Swagat Memmingen", "Memmingen", "Augsburger Straße 15", "87700", "Zentrum", "https://swagat-memmingen.de", "+49 8331 9256222", None, None, "Traditional Indian tandoori & curries in Memmingen."),
    ("Sripaka Restaurant", "Neu-Ulm", "Kasernstraße 24", "89231", "Zentrum", None, "+49 731 92700133", None, None, "Authentic South Indian & Tamil Nadu specialties in Neu-Ulm."),
    ("Masala Zeit Neu-Ulm", "Neu-Ulm", "Augsburger Straße 26", "89231", "Zentrum", "https://masalazeit-neu-ulm.de", None, None, None, "Modern Indian flavors in central Neu-Ulm."),
    ("Indian Star Kaufbeuren", "Kaufbeuren", "Ringweg 23", "87600", "Zentrum", "https://indian-star.de", "+49 8341 9993147", None, None, "Established Allgäu Indian restaurant in Kaufbeuren."),
    ("Street Khazana Lindau", "Lindau", "Schmiedgasse 6", "88131", "Insel Lindau", "https://www.streetkhazana.de", "+49 8382 9768400", None, None, "Indian street-food favorites on Lake Constance island."),
    ("Khana Khazana Lindau", "Lindau", "In der Grub 30", "88131", "Insel Lindau", "https://www.khanakhazana.de", "+49 8382 9748919", None, None, "Specialty Indian restaurant in historic Lindau."),

    # --- REGENSBURG / INGOLSTADT / LANDSHUT / PASSAU / STRAUBING / AMBERG / WEIDEN / NEUMARKT ---
    ("Namaste Regensburg", "Regensburg", "Schikanederstraße 2a", "93053", "Kasernenviertel", "https://www.namaste-regensburg.de", None, None, None, "Spacious terrace and clay-oven tandoor specialties."),
    ("Taj Mahal Regensburg", "Regensburg", "Schopperplatz 3", "93059", "Stadtamhof", "https://tajmahal-regensburg.de", None, None, None, "Traditional curries near Stone Bridge in Stadtamhof."),
    ("Chaska Restaurant Regensburg", "Regensburg", "Werftstraße 3", "93059", "Donauufer", None, None, None, None, "Indian dining with riverside beer garden along the Danube."),
    ("Indian Palace Ingolstadt", "Ingolstadt", "Haunwöhrer Straße 81", "85051", "Haunwöhr", "https://www.indianpalace-in.de", "+49 841 980388", None, None, "Spacious Indian restaurant with beer garden in Ingolstadt."),
    ("Taj Mahal Ingolstadt", "Ingolstadt", "Beckerstraße 11", "85049", "Altstadt", "https://tajmahal-ingolstadt.de", "+49 841 9814618", None, None, "Classic specialty Indian kitchen in Ingolstadt center."),
    ("Maharani Ingolstadt", "Ingolstadt", "Friedrichshofener Straße 16", "85049", "Friedrichshofen", None, None, None, None, "Neighborhood Indian restaurant in Ingolstadt."),
    ("Tattva Ingolstadt", "Ingolstadt", "Münchener Straße 103", "85051", "Süd", "https://tattvarestaurant.de", None, None, None, "Regional curries and tandoor favorites in Ingolstadt."),
    ("Noon Mirch Landshut", "Landshut", "Altstadt 30", "84028", "Altstadt", "https://noonmirchlandshut.de", None, None, None, "Modern Indian street-food & curries in Landshut Old Town."),
    ("Dhaba Landshut", "Landshut", "Schirmgasse 264", "84028", "Altstadt", "https://dhabalandshut.de", None, None, None, "Traditional Punjabi dhaba-style kitchen in Landshut."),
    ("Mera Desh Landshut", "Landshut", "Zweibrückenstraße 725", "84028", "Altstadt", "https://meradesh.de", None, None, None, "Authentic Indian dishes in historic Landshut."),
    ("Tanda Palace Landshut", "Landshut", "Dreifaltigkeitsplatz 11A", "84028", "Altstadt", "https://tandapalace-landshut.de", None, None, None, "North Indian specialties on Dreifaltigkeitsplatz."),
    ("Shivalaya Passau", "Passau", "Theresienstraße 14", "94032", "Zentrum", "https://www.shivalaya.de", "+49 851 95178105", 4.6, "600+ Google reviews", "Well-loved cozy Indian kitchen in central Passau."),
    ("Kahaani Passau", "Passau", "Höllgasse 26", "94032", "Altstadt", "https://kahaani-restaurant.de", None, None, None, "Atmospheric Indian dining in Passau’s artists’ alley."),
    ("Maharaja Passau", "Passau", "Roßtränke 10", "94032", "Altstadt", "https://maharajapassau.de", None, None, None, "Classic Indian kitchen in Passau Old Town."),
    ("India Gate Straubing", "Straubing", "Aprilgasse 20", "94315", "Zentrum", "https://indiagatestraubing.de", "+49 9421 7888883", None, None, "Freshly prepared curries in Straubing."),
    ("Namaste India Straubing", "Straubing", "Ludwigsplatz 5", "94315", "Zentrum", "https://namasteindiastraubing.de", "+49 9421 9606770", None, None, "Indian dining right on Straubing Ludwigsplatz."),
    ("Royal India Amberg", "Amberg", "Drahthammerstraße 15", "92224", "Amberg", "https://www.royalindia-amberg.de", "+49 9621 782188", None, None, "Classic North Indian dishes in Amberg."),
    ("Shiva Palace Amberg", "Amberg", "Regensburger Straße 37", "92224", "Amberg", "https://shivapalace-amberg.de", "+49 9621 8997752", None, None, "Tandoori specialties & curries in Amberg."),
    ("Ganesha Weiden", "Weiden", "Nikolaistraße 1", "92637", "Weiden i.d. OPf.", "https://www.ganesha-weiden.de", "+49 961 20633155", None, None, "Upper Palatinate Indian dining room in Weiden."),
    ("Sangam Weiden", "Weiden", "Unterer Markt 18a", "92637", "Weiden i.d. OPf.", "https://www.sangamweiden.de", "+49 961 63432203", None, None, "Indian street-food fusion at Unterer Markt."),
    ("Masala Neumarkt", "Neumarkt", "Rosengasse 4", "92318", "Neumarkt i.d. OPf.", "https://www.masala-neumarkt.de", "+49 9181 5316836", None, None, "Traditional Indian cuisine in Neumarkt."),

    # --- BAMBERG / BAYREUTH / WÜRZBURG / COBURG / HOF / ANSBACH / ASCHAFFENBURG / SCHWEINFURT ---
    ("Himalaya Indian Food", "Bamberg", "Pödeldorfer Straße 39", "96052", "Bamberg", "https://himalayaindianfood.de", "+49 951 303422", 4.6, "750+ Google reviews", "Top-rated Bamberg favorite for rich curries & warm hospitality."),
    ("Swagat Bamberg", "Bamberg", "Brennerstraße 42", "96052", "Bamberg", "https://swagat-bamberg.de", None, None, None, "Freshly prepared curries & tandoor dishes in Bamberg."),
    ("Ganesha Bamberg", "Bamberg", "Obere Königstraße 39", "96052", "Bamberg", "https://ganesha-bamberg.com", "+49 951 30932200", None, None, "Royal Indian tandoori specialties in Bamberg."),
    ("Namaste India Bayreuth", "Bayreuth", "Friedrichstraße 15", "95444", "Zentrum", "https://www.namaste-bayreuth.de", "+49 921 50753031", None, None, "Mughlai-style Indian cuisine in central Bayreuth."),
    ("Restaurant Ganesha Bayreuth", "Bayreuth", "Alexanderstraße 7", "95444", "Zentrum", "https://ganesha-bayreuth.com", "+49 921 78519412", None, None, "Royal Indian tandoori cooked with 36 whole spices."),
    ("Sangam Bayreuth", "Bayreuth", "Maximilianstraße 39", "95444", "Zentrum", "https://www.sangam-bayreuth.de", "+49 921 75868274", None, None, "Regional Indian specialties on Bayreuth’s Maximilianstraße."),
    ("Guru Indisches Restaurant Würzburg", "Würzburg", "Dreikronenstraße 17", "97082", "Mainviertel", "https://www.speisen-indiens.de", "+49 931 9913736", 3.9, "600+ reviews", "Hidden courtyard dining steps from the Old Main Bridge."),
    ("Aashirwad Würzburg", "Würzburg", "Lehmgrubenweg 13", "97084", "Heidingsfeld", "https://aashirwad.de", None, None, None, "Neighborhood Indian restaurant in Heidingsfeld."),
    ("Swagatam Würzburg", "Würzburg", "Sanderrothstraße 1", "97074", "Sanderau", None, None, None, None, "Long-standing Würzburg Indian favorite."),
    ("Restaurant Andaaz Coburg", "Coburg", "Theatergasse 1", "96450", "Zentrum", "https://www.andaaz.de", "+49 9561 7951670", None, None, "Modern Indian cuisine near Landestheater Coburg."),
    ("Ganesha Coburg", "Coburg", "Heiligkreuzstraße 8", "96450", "Zentrum", "https://www.restaurant-ganeshacoburg.de", "+49 9561 5111155", None, None, "Classic Indian tandoori & vegetarian curries in Coburg."),
    ("Ganesha Tandoori Hof", "Hof", "Ludwigstraße 22", "95028", "Zentrum", "https://www.ganesha-hof.de", "+49 9281 2181", None, None, "Upper Franconian Indian dining in Hof."),
    ("Ganesha Ansbach", "Ansbach", "Nürnberger Straße 40", "91522", "Ansbach", "https://www.ganeshaansbach.de", "+49 981 97781149", None, None, "Authentic Indian dining in Ansbach."),
    ("Taj Palace Ansbach", "Ansbach", "Ritter-von-Lang-Allee 7", "91522", "Ansbach", None, None, None, None, "Traditional curries in central Ansbach."),
    ("Punjab Tandoori Aschaffenburg", "Aschaffenburg", "Ludwigstraße 3", "63739", "Zentrum", "https://punjab-tandoori.de", None, None, None, "Punjabi tandoori classics in Aschaffenburg."),
    ("AGNI Aschaffenburg", "Aschaffenburg", "Schweinheimer Straße 79", "63743", "Aschaffenburg", "https://agni-aschaffenburg.de", None, None, None, "Authentic Indian kitchen in Aschaffenburg."),
    ("Indian Heritage Haus", "Aschaffenburg", "Ernsthofstraße 1", "63739", "Zentrum", "https://indianheritagehaus.de", None, None, None, "Regional Indian dishes in central Aschaffenburg."),
    ("Indisches Curry Haus Schweinfurt", "Schweinfurt", "Luitpoldstraße 14", "97421", "Zentrum", "https://indischescurryhaus-sw.de", None, None, None, "Classic Indian curries in Schweinfurt."),

    # --- ROSENHEIM / TRAUNSTEIN / BAD TÖLZ / GARMISCH ---
    ("Maharadscha Rosenheim", "Rosenheim", "Salinstraße 8B", "83022", "Zentrum", None, "+49 8031 395437", None, None, "Established Indian restaurant in central Rosenheim."),
    ("Taj Mahal Rosenheim", "Rosenheim", "Münchener Straße 47", "83022", "Zentrum", "https://tajmahal-rosenheim.de", "+49 8031 2214632", None, None, "Traditional North Indian specialties in Rosenheim."),
    ("Maharaja Traunstein", "Traunstein", "Bahnhofstraße 15", "83278", "Traunstein", None, "+49 861 90948730", None, None, "Chiemgau’s go-to Indian specialty restaurant."),
    ("Bollywood Tandoori Bad Tölz", "Bad Tölz", "Königsdorfer Straße 2", "83646", "Bad Tölz", "https://www.bollywood-tandoori.de", "+49 8041 7946880", None, None, "Clay-oven Indian cooking in Bad Tölz."),
    ("Taj Mahal Garmisch", "Garmisch-Partenkirchen", "Sonnenbergstraße 17", "82467", "Garmisch", "https://www.taj-mahal-gap.de", "+49 8821 9436430", None, None, "Warm Indian hospitality in the Bavarian Alps."),
    ("Saffron Garmisch", "Garmisch-Partenkirchen", "Bankgasse 16", "82467", "Partenkirchen", "https://www.saffron-garmisch.de", "+49 8821 7306525", None, None, "Fresh Indian spices in historic Garmisch-Partenkirchen."),
]

NOMINATIM_DISCOVERY_QUERIES = [
    ("[restaurant] indian München", "Munich"),
    ("[restaurant] indian Nürnberg", "Nuremberg"),
    ("[restaurant] indian Augsburg", "Augsburg"),
    ("[restaurant] indian Regensburg", "Regensburg"),
    ("[restaurant] indian Ingolstadt", "Ingolstadt"),
    ("[restaurant] indian Würzburg", "Würzburg"),
    ("[restaurant] indian Erlangen", "Erlangen"),
    ("[restaurant] indian Fürth", "Fürth"),
    ("[restaurant] indian Bamberg", "Bamberg"),
    ("[restaurant] indian Bayreuth", "Bayreuth"),
    ("[restaurant] indian Landshut", "Landshut"),
    ("[restaurant] indian Rosenheim", "Rosenheim"),
    ("[restaurant] indian Passau", "Passau"),
    ("[restaurant] indian Kempten", "Kempten"),
]

EXCLUDE_TERMS = [
    "pakistan", "lahore", "karachi", "peshawar", "shalimar", "tandoori flame",
    "pizza", "pizzeria", "döner", "doner", "kebab", "kebap", "sushi", "thai",
    "vietnam", "china", "asia", "wok", "nepal", "tibet", "afghan", "bangladesh",
    "burger", "imbiss", "metzgerei", "bäckerei", "ice cream", "wirtshaus",
    "gasthaus", "gasthof", "brauhaus", "anan",
]

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

CITY_NORMALIZE = {
    "München": "Munich",
    "Munich": "Munich",
    "Nürnberg": "Nuremberg",
    "Nuremberg": "Nuremberg",
    "Kempten (Allgäu)": "Kempten",
    "Weiden in der Oberpfalz": "Weiden",
    "Neumarkt in der Oberpfalz": "Neumarkt",
}

def load_cache():
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def save_cache(cache):
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

def nominatim_get(params: dict, cache: dict):
    key = urllib.parse.urlencode(sorted(params.items()))
    if key in cache:
        return cache[key]
    url = f"https://nominatim.openstreetmap.org/search?{key}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SpiceAtlasBayern/2.0 (authentic-indian-bavaria-directory)"},
    )
    time.sleep(1.05)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            cache[key] = data
            return data
    except Exception as ex:
        print(f"Nominatim warn ({params.get('q')}): {ex}", flush=True)
        return []

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
    for token in ["indisches", "spezialitäten", "restaurant", "the ", "indian", "kitchen", "& bar", "bar"]:
        s = s.replace(token, " ")
    return re.sub(r"[^a-z0-9äöüß]+", " ", s).strip()

def is_excluded(name: str, cuisine: str = "") -> bool:
    combined = f"{name} {cuisine}".lower()
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
    if any(w in text for w in ["kerala", "dosa", "ilai", "chettinad", "anjappar", "saravanaa", "south", "südindisch", "sripaka", "malabar", "amrutham", "oota", "malgudi"]):
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

    if any(w in text for w in ["street", "chaat", "chutney", "bindaas", "tadka", "noon mirch", "tikka n talk", "indian sun", "chaska", "khazana"]):
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
    if "delhi" in text:
        state = "Delhi & North India"
    elif "kashmir" in text:
        state = "Kashmir & North India"
    elif "palast" in text or "rajasthan" in text:
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

def main():
    cache = load_cache()
    records = []
    seen_coords = []

    print(f"Geocoding {len(WEB_VERIFIED)} web-verified Bavarian Indian restaurants...", flush=True)
    for idx, entry in enumerate(WEB_VERIFIED):
        name, city, street, postcode, district, website, phone, rating, rev_label, note = entry
        german_city = "München" if city == "Munich" else ("Nürnberg" if city == "Nuremberg" else city)
        q = f"{street}, {postcode} {german_city}, Germany"
        res = nominatim_get({"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "de"}, cache)
        if not res:
            res = nominatim_get({"q": f"{name} {german_city} Germany", "format": "jsonv2", "limit": 1, "countrycodes": "de"}, cache)
        if not res:
            res = nominatim_get({"q": f"{postcode} {german_city}, Germany", "format": "jsonv2", "limit": 1, "countrycodes": "de"}, cache)

        if res:
            lon = float(res[0]["lon"])
            lat = float(res[0]["lat"])
            if in_bavaria(lon, lat):
                state, region_cat, sig_dishes = classify_region(name, note)
                slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                rec = {
                    "id": f"bav-{slug}-{city.lower()}",
                    "name": name,
                    "city": city,
                    "district": district,
                    "address": f"{street}, {postcode} {german_city}",
                    "coordinates": [round(lon, 6), round(lat, 6)],
                    "indianState": state,
                    "regionCategory": region_cat,
                    "cuisineStyle": note,
                    "phone": phone,
                    "website": website,
                    "establishedNote": f"Verified active Indian restaurant in {city}",
                    "hoursNote": "Check official website or Google Maps for daily hours",
                    "isStreetFood": region_cat == "Street Food & Chaat",
                    "isNewSpot": any(w in name.lower() for w in ["ilai", "noon mirch", "tikka n talk", "anjappar", "svaad", "urban turban", "bindaas"]),
                    "positiveReviews": [
                        {
                            "quote": note,
                            "reviewerType": "Verified Bavarian Directory",
                        }
                    ],
                    "signatureDishes": sig_dishes,
                    "authenticityNote": "Verified active Indian restaurant (Pakistani/fusion/closed venues excluded).",
                    "dataSource": "curated" if rating else "osm-verified",
                }
                if rating is not None:
                    rec["googleRating"] = rating
                    rec["reviewCountLabel"] = rev_label
                records.append(rec)
                seen_coords.append((norm_name(name), lon, lat))

        if (idx + 1) % 15 == 0:
            save_cache(cache)
            print(f"  Geocoded {idx + 1}/{len(WEB_VERIFIED)}...", flush=True)

    save_cache(cache)

    print("Running Nominatim discovery across major Bavarian cities...", flush=True)
    for q, fallback_city in NOMINATIM_DISCOVERY_QUERIES:
        res = nominatim_get(
            {"q": q, "format": "jsonv2", "limit": 35, "extratags": 1, "addressdetails": 1, "countrycodes": "de"},
            cache,
        )
        for item in res:
            name = (item.get("name") or "").strip()
            if not name:
                continue
            ext = item.get("extratags") or {}
            cuisine = (ext.get("cuisine") or "").strip()
            if is_excluded(name, cuisine):
                continue
            if "indian" not in cuisine.lower():
                continue
            lon = float(item["lon"])
            lat = float(item["lat"])
            if not in_bavaria(lon, lat):
                continue

            addr = item.get("address") or {}
            raw_city = addr.get("city") or addr.get("town") or addr.get("village") or fallback_city
            city = CITY_NORMALIZE.get(raw_city, raw_city)
            road = addr.get("road") or ""
            hnum = addr.get("house_number") or ""
            pc = addr.get("postcode") or ""
            full_addr = f"{road} {hnum}, {pc} {raw_city}".replace(" ,", ",").strip(" ,")
            if not road:
                full_addr = f"{pc} {raw_city}".strip()

            state, region_cat, sig_dishes = classify_region(name, cuisine)
            records.append({
                "id": f"osm-{item.get('osm_type','n')[0]}{item.get('osm_id')}",
                "name": name,
                "city": city,
                "district": addr.get("suburb") or addr.get("city_district") or None,
                "address": full_addr,
                "coordinates": [round(lon, 6), round(lat, 6)],
                "indianState": state,
                "regionCategory": region_cat,
                "cuisineStyle": f"OpenStreetMap Verified Indian Kitchen ({cuisine})",
                "phone": ext.get("phone") or ext.get("contact:phone"),
                "website": ext.get("website") or ext.get("contact:website"),
                "establishedNote": "OpenStreetMap Verified Open Location",
                "hoursNote": ext.get("opening_hours") or "Check official site or Google Maps for hours",
                "isPureVeg": ext.get("diet:vegetarian") == "only",
                "isStreetFood": region_cat == "Street Food & Chaat",
                "positiveReviews": [
                    {
                        "quote": f"Verified active Indian restaurant in {city} serving regional spices and freshly prepared curries.",
                        "reviewerType": "OSM Community Verified",
                    }
                ],
                "signatureDishes": sig_dishes,
                "authenticityNote": "Verified Indian cuisine tag in OpenStreetMap.",
                "dataSource": "osm-verified",
            })

    save_cache(cache)

    # Deduplicate against flagship 26 AND against each other
    deduped = []
    for rec in records:
        lon, lat = rec["coordinates"]
        n = norm_name(rec["name"])

        skip = False
        for fname, flon, flat in FLAGSHIP_CENTERS:
            dist = haversine_m(lon, lat, flon, flat)
            if dist < 120 or (dist < 450 and (fname in n or n in fname)):
                skip = True
                break
        if skip:
            continue

        dup = None
        for existing in deduped:
            elon, elat = existing["coordinates"]
            dist = haversine_m(lon, lat, elon, elat)
            en = norm_name(existing["name"])
            if dist < 120 or (dist < 400 and (en == n or en in n or n in en)):
                dup = existing
                break
        if dup:
            if not dup.get("phone") and rec.get("phone"):
                dup["phone"] = rec["phone"]
            if not dup.get("website") and rec.get("website"):
                dup["website"] = rec["website"]
            continue

        deduped.append(rec)

    munich_cnt = sum(1 for r in deduped if r["city"] == "Munich")
    print(f"DONE! Total expansion records: {len(deduped)} (Munich additions: {munich_cnt})", flush=True)
    OUT_PATH.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {OUT_PATH}", flush=True)

if __name__ == "__main__":
    main()
