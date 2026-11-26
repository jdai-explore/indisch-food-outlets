import { FlavorSwap, SeasonalSpotlight } from '../types/restaurant';

export const FLAVOR_SWAPS: FlavorSwap[] = [
  {
    id: 'swap-butter-chicken',
    usualOrder: 'Butter Chicken',
    usualProblem: 'Heavy cream and sweet tomato mask the complexity of whole spices.',
    tryInstead: 'Chettinad Pepper Chicken or Kerala Kozhi Roast',
    region: 'Tamil Nadu & Kerala',
    whyItsBetter:
      'Freshly roasted black peppercorns, star anise, curry leaves, and slow-caramelized shallots create deep, aromatic heat without heavy cream.',
    spiceLevel: 4,
    restaurantIds: ['anjappar-munich', 'spice-route-munich', 'oota-regensburg'],
  },
  {
    id: 'swap-garlic-naan',
    usualOrder: 'Garlic Naan',
    usualProblem: 'Refined flour flatbread leaves you feeling overly full before the meal peaks.',
    tryInstead: 'Ghee Roast Masala Dosa or Lacy Appam',
    region: 'South & Coastal India',
    whyItsBetter:
      'Naturally fermented rice-and-lentil batter crisps into a golden crepe or soft-centered hopper—light, tangy, and gluten-friendly.',
    spiceLevel: 2,
    restaurantIds: ['saravanaa-bhavan-munich', 'spice-route-munich', 'malgudi-munich', 'oota-regensburg'],
  },
  {
    id: 'swap-tikka-masala',
    usualOrder: 'Chicken Tikka Masala',
    usualProblem: 'An all-purpose restaurant invention rather than a regional Indian home staple.',
    tryInstead: 'Kolhapuri Misal Pav or Mutton Rogan Josh',
    region: 'Maharashtra & Kashmir',
    whyItsBetter:
      'Kolhapuri blends roasted coconut, sesame, and red chilies for bold punch; authentic Kashmiri Rogan Josh glows from dried cockscomb & fennel, not food dye.',
    spiceLevel: 4,
    restaurantIds: ['swaad-schwabing', 'indian-mantra-ingolstadt', 'the-indian-room-munich'],
  },
  {
    id: 'swap-mango-lassi',
    usualOrder: 'Sweet Mango Lassi',
    usualProblem: 'Canned mango syrup paired with spicy food dulls your palate.',
    tryInstead: 'Kokum Solkadhi or Madras Filter Kaapi',
    region: 'Konkan Coast & Tamil Nadu',
    whyItsBetter:
      'Chilled pink Solkadhi (kokum fruit & coconut milk) cools heat cleanly, while frothy brass-tumbler Filter Kaapi closes the meal like an espresso.',
    spiceLevel: 1,
    restaurantIds: ['swaad-schwabing', 'anjappar-munich', 'saravanaa-bhavan-munich', 'oota-regensburg'],
  },
  {
    id: 'swap-samosa',
    usualOrder: 'Standard Veg Samosa',
    usualProblem: 'Often served lukewarm with generic tamarind-ketchup dip.',
    tryInstead: 'Pani Puri Shots, Vada Pav or Medhu Vada',
    region: 'Mumbai & South Indian Street Carts',
    whyItsBetter:
      'Crispy hollow puris bursting with chilled mint-tamarind water, or spiced lentil donuts dipped in hot sambar and coconut chutney.',
    spiceLevel: 3,
    restaurantIds: ['madam-chutney-munich', 'bindaas-munich', 'noon-mirch-augsburg', 'little-india-wuerzburg'],
  },
];

export const SEASONAL_SPOTLIGHTS: SeasonalSpotlight[] = [
  {
    id: 'winter-pepper-broths',
    seasonTag: 'Bavarian Winter Warming',
    title: 'Black Pepper & Curry Leaf Comfort for Cold Munich Evenings',
    subtitle: 'Beat the Isar frost with slow-simmered South & Coastal broths',
    dishFocus: 'Milagu Rasam, Kerala Fish Moilee & Chettinad Pepper Mutton',
    whyNowInBavaria:
      'Traditional South Indian black pepper, ginger, and tamarind broths warm from within far better than heavy cream sauces during November–February chills.',
    restaurantIds: ['spice-route-munich', 'anjappar-munich', 'oota-regensburg'],
  },
  {
    id: 'winter-tandoor-dum',
    seasonTag: 'Slow-Cooked & Clay Oven',
    title: 'Charcoal Tandoor & Sealed-Pot Dum Biryanis',
    subtitle: '24-hour marinated meats & aromatic basmati steamed under dough',
    dishFocus: 'Hyderabadi Dum Biryani, Dal Makhani (18hr) & Lamb Shank Nihari',
    whyNowInBavaria:
      'Rich winter comfort rooted in authentic charcoal smoke and whole cardamom, mace, and saffron—ideal for crisp Franconian and Upper Bavarian nights.',
    restaurantIds: ['the-indian-room-munich', 'delhi-mehek-munich', 'sangam-nuremberg', 'maharaja-ii-wuerzburg'],
  },
  {
    id: 'lunch-mittagsmenue',
    seasonTag: 'Weekday Value · Mittagsmenü',
    title: 'Authentic Thalis & Weekday Lunch Specials Under €15',
    subtitle: 'Fast, balanced regional plates for Munich & Bavarian workdays',
    dishFocus: 'Maharashtrian Thali, Mini Dosa Combos & Ayurvedic Lunch Bowls',
    whyNowInBavaria:
      'Many top kitchens run weekday 11:30–14:30 lunch platters featuring dal, seasonal sabzi, rice, and fresh bread at approachable weekday prices.',
    restaurantIds: ['swaad-schwabing', 'indian-mango-munich', 'saravanaa-bhavan-munich', 'swagat-munich'],
  },
  {
    id: 'new-wave-bavaria',
    seasonTag: 'New & Rising Wave',
    title: 'Modern Regional Kitchens Redefining Bavaria',
    subtitle: 'Hyper-regional South Indian, Marathi & urban Indian street kitchens',
    dishFocus: 'Appam & Stew, Misal Pav, Avocado Sev Puri & Chai Flights',
    whyNowInBavaria:
      'A new generation of Indian chefs across Munich, Regensburg, and Augsburg has moved decisively past generic curry-house templates.',
    restaurantIds: ['spice-route-munich', 'bindaas-munich', 'oota-regensburg', 'noon-mirch-augsburg'],
  },
];
