import { IndianRegionCategory } from '../types/restaurant';

export interface RegionStyle {
  label: string;
  shortLabel: string;
  color: string;
  bgSoft: string;
  border: string;
}

export const REGION_STYLES: Record<IndianRegionCategory, RegionStyle> = {
  'South Indian': {
    label: 'South Indian (Tamil Nadu, Kerala, Karnataka)',
    shortLabel: 'South Indian',
    color: '#0F766E',
    bgSoft: 'rgba(15, 118, 110, 0.14)',
    border: 'rgba(15, 118, 110, 0.36)',
  },
  'North Indian & Tandoori': {
    label: 'North Indian, Punjab, Delhi & Royal Mughlai',
    shortLabel: 'North & Tandoori',
    color: '#D97706',
    bgSoft: 'rgba(217, 119, 6, 0.15)',
    border: 'rgba(217, 119, 6, 0.38)',
  },
  'Western & Marathi': {
    label: 'Western India & Maharashtra',
    shortLabel: 'Maharashtra & West',
    color: '#B45309',
    bgSoft: 'rgba(180, 83, 9, 0.15)',
    border: 'rgba(180, 83, 9, 0.36)',
  },
  'Street Food & Chaat': {
    label: 'Indian Street Food & Chaat',
    shortLabel: 'Street Food',
    color: '#BE123C',
    bgSoft: 'rgba(190, 18, 60, 0.14)',
    border: 'rgba(190, 18, 60, 0.36)',
  },
};

export function getRegionStyle(category: IndianRegionCategory): RegionStyle {
  return REGION_STYLES[category];
}
