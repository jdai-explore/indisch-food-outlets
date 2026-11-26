export type BavarianCity = string;

export type IndianRegionCategory =
  | 'South Indian'
  | 'North Indian & Tandoori'
  | 'Western & Marathi'
  | 'Street Food & Chaat';

export interface DishRecommendation {
  name: string;
  regionalOrigin: string;
  description: string;
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  dietary: ('Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Dairy-Free' | 'Signature')[];
  insteadOf?: string;
}

export interface PositiveReview {
  quote: string;
  reviewerType: string;
  highlightDish?: string;
}

export interface RestaurantOffer {
  title: string;
  details: string;
  validNote: string;
}

export interface Restaurant {
  id: string;
  name: string;
  city: BavarianCity;
  district?: string | null;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  googleRating?: number;
  reviewCountLabel?: string;
  indianState: string;
  regionCategory: IndianRegionCategory;
  cuisineStyle: string;
  phone?: string | null;
  website?: string | null;
  establishedNote: string;
  hoursNote: string;
  isNewSpot?: boolean;
  isFineDining?: boolean;
  isStreetFood?: boolean;
  isPureVeg?: boolean;
  isSeasonalWinterPick?: boolean;
  seasonalReason?: string;
  ongoingOffer?: RestaurantOffer;
  positiveReviews: PositiveReview[];
  signatureDishes: DishRecommendation[];
  authenticityNote: string;
  dataSource?: 'curated' | 'osm-verified';
}

export interface CityPreset {
  id: string;
  label: string;
  cityFilter: BavarianCity | 'All';
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface FlavorSwap {
  id: string;
  usualOrder: string;
  usualProblem: string;
  tryInstead: string;
  region: string;
  whyItsBetter: string;
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  restaurantIds: string[];
}

export interface SeasonalSpotlight {
  id: string;
  seasonTag: string;
  title: string;
  subtitle: string;
  dishFocus: string;
  whyNowInBavaria: string;
  restaurantIds: string[];
}
