
export enum Language {
  EN = 'en',
  HI = 'hi'
}

export enum UserRole {
  USER = 'user',
  VENDOR = 'vendor',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  _id?: string; // Support MongoDB style ID
  name: string;
  email: string;
  role: UserRole;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  price: number;
  distance: number;
  image: string;
  verified: boolean;
  description: string;
}

export interface Booking {
  id: string;
  vendorId: string;
  vendorName: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  date: string;
  amount: number;
  otp: string;
}

export interface Translation {
  searchPlaceholder: string;
  categories: string;
  popularServices: string;
  vendorMode: string;
  userMode: string;
  bookings: string;
  cart: string;
  profile: string;
  login: string;
  register: string;
  nearby: string;
  tent: string;
  dj: string;
  catering: string;
  viewDetails: string;
  bookNow: string;
}

export const Translations: Record<Language, Translation> = {
  [Language.EN]: {
    searchPlaceholder: "Search for Tent, DJ, Catering...",
    categories: "Categories",
    popularServices: "Popular Services Near You",
    vendorMode: "Vendor Mode",
    userMode: "User Mode",
    bookings: "My Bookings",
    cart: "Cart",
    profile: "Profile",
    login: "Login",
    register: "Sign Up",
    nearby: "Within 25KM",
    tent: "Tent House",
    dj: "DJ & Sound",
    catering: "Catering",
    viewDetails: "View Details",
    bookNow: "Book Now"
  },
  [Language.HI]: {
    searchPlaceholder: "टेंट, डीजे, खानपान खोजें...",
    categories: "श्रेणियां",
    popularServices: "आपके पास लोकप्रिय सेवाएं",
    vendorMode: "विक्रेता मोड",
    userMode: "यूजर मोड",
    bookings: "मेरी बुकिंग",
    cart: "कार्ट",
    profile: "प्रोफ़ाइल",
    login: "लॉगिन",
    register: "साइन अप",
    nearby: "25KM के भीतर",
    tent: "टेंट हाउस",
    dj: "डीजे और साउंड",
    catering: "खानपान",
    viewDetails: "विवरण देखें",
    bookNow: "अभी बुक करें"
  }
};