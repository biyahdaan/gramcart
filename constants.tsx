
import { Vendor } from './types';

export const GLOBAL_CATEGORIES: Record<string, { name: string, icon: string, color: string, items: string[] }> = {
  tent: { 
    name: 'Tent House', 
    icon: 'fa-campground', 
    color: 'bg-blue-100 text-blue-600',
    items: ['Waterproof Pandal', 'VIP Chairs', 'Round Tables', 'Sofa Sets', 'Carpeting', 'Entrance Gate', 'Ceiling Cloth', 'Curtains', 'Fans/Coolers']
  },
  dj: { 
    name: 'DJ & Sound', 
    icon: 'fa-music', 
    color: 'bg-purple-100 text-purple-600',
    items: ['Base Speakers', 'Top Speakers', 'Sharpy Lights', 'Smoke Machine', 'LED Floor', 'Console Mixer', 'Wireless Mics', 'Generator Backup']
  },
  catering: { 
    name: 'Catering', 
    icon: 'fa-utensils', 
    color: 'bg-orange-100 text-orange-600',
    items: ['Plates & Spoons', 'Buffet Stalls', 'Water Dispensers', 'Serving Trays', 'Chafing Dishes', 'Main Course Stalls', 'Dessert Counter', 'Waiters']
  },
  electric: { 
    name: 'Lighting', 
    icon: 'fa-lightbulb', 
    color: 'bg-yellow-100 text-yellow-600',
    items: ['Serial Lights', 'Halogen Lamps', 'Focus Lights', 'Garden Lighting', 'Building Decoration', 'Panel Board', 'LED Strips']
  },
  photography: { 
    name: 'Photography', 
    icon: 'fa-camera', 
    color: 'bg-green-100 text-green-600',
    items: ['DSLR Coverage', '4K Video Recording', 'Drone Shot', 'Candid Photography', 'Photo Album', 'Live Streaming', 'Crane/Jimmy']
  },
  decoration: { 
    name: 'Decoration', 
    icon: 'fa-flower-tulip', 
    color: 'bg-pink-100 text-pink-600',
    items: ['Fresh Flowers', 'Artificial Flowers', 'Balloon Decor', 'Stage Backdrop', 'Car Decoration', 'Mandap Setup', 'Selfie Point']
  },
  generator: {
    name: 'Generators',
    icon: 'fa-bolt',
    color: 'bg-gray-100 text-gray-600',
    items: ['15 KVA Generator', '30 KVA Generator', '62 KVA Generator', 'Fuel Extra', 'Operator Included']
  }
};

export const CATEGORIES = Object.entries(GLOBAL_CATEGORIES).map(([id, cat]) => ({
  id,
  name: cat.name,
  icon: cat.icon,
  color: cat.color
}));

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
  }
];

export const BANNERS = [
  { id: 1, text: "Wedding Season Special: 20% Off on Tents", color: "bg-indigo-600" },
  { id: 2, text: "Book DJs Early for Festival Season", color: "bg-pink-600" }
];
