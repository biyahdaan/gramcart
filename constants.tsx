
import { Vendor } from './types';

export const CATEGORIES = [
  { id: 'tent', name: 'Tent House', icon: 'fa-campground', color: 'bg-blue-100 text-blue-600' },
  { id: 'dj', name: 'DJ & Sound', icon: 'fa-music', color: 'bg-purple-100 text-purple-600' },
  { id: 'catering', name: 'Catering', icon: 'fa-utensils', color: 'bg-orange-100 text-orange-600' },
  { id: 'electric', name: 'Lighting', icon: 'fa-lightbulb', color: 'bg-yellow-100 text-yellow-600' },
];

export const MOCK_VENDORS: Vendor[] = [
  {
    id: '1',
    name: 'Suresh Tent House',
    category: 'tent',
    rating: 4.8,
    reviewsCount: 124,
    price: 5000,
    distance: 4.2,
    image: 'https://picsum.photos/seed/tent1/400/300',
    verified: true,
    description: 'Best quality tents for weddings and local festivals. Waterproof material.'
  },
  {
    id: '2',
    name: 'Royal DJ Group',
    category: 'dj',
    rating: 4.5,
    reviewsCount: 89,
    price: 3500,
    distance: 12.5,
    image: 'https://picsum.photos/seed/dj1/400/300',
    verified: true,
    description: 'High bass speakers with laser lighting. Perfect for baraat.'
  },
  {
    id: '3',
    name: 'Annapurna Catering',
    category: 'catering',
    rating: 4.9,
    reviewsCount: 210,
    price: 15000,
    distance: 2.1,
    image: 'https://picsum.photos/seed/food1/400/300',
    verified: true,
    description: 'Traditional village taste with hygiene. Specialized in Halwai services.'
  }
];

export const BANNERS = [
  { id: 1, text: "Wedding Season Special: 20% Off on Tents", color: "bg-indigo-600" },
  { id: 2, text: "Book DJs Early for Festival Season", color: "bg-pink-600" }
];
