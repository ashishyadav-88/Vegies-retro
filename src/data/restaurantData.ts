import { RestaurantInfo, ServiceItem, WhyChooseItem, UpiPaymentConfig } from '../types';

export const RESTAURANT_INFO: RestaurantInfo = {
  name: 'Vegies Restro',
  tagline: 'Delicious Food, Made With Love',
  category: 'Restaurant & Pure Flavors',
  phone: '7028818440',
  formattedPhone: '+91 70288 18440',
  address: {
    landmark: 'Santosh Bhuvan',
    area: 'Nalasopara East',
    city: 'Palghar',
    state: 'Maharashtra',
    pincode: '401209',
    country: 'India',
    full: 'Santosh Bhuvan, Nalasopara East, Palghar, Maharashtra 401209, India',
  },
  hours: {
    open: '9:00 AM',
    close: '11:00 PM',
    display: '9:00 AM – 11:00 PM',
    days: 'Open Daily (Monday – Sunday)',
  },
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Santosh+Bhuvan+Nalasopara+East+Palghar+Maharashtra+401209+India',
  whatsappUrl: 'https://wa.me/917028818440?text=Hello%20Vegies%20Restro,%20I%20would%20like%20to%20inquire%20about%20your%20menu%20and%20services.',
};

export const UPI_PAYMENT_CONFIG: UpiPaymentConfig = {
  upiId: '7028818440@kotakbank',
  payeeName: 'PARVATI DEVI',
  bankName: 'Kotak 811',
  phone: '7028818440',
};

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'dine-in',
    title: 'Dine-In',
    description: 'Enjoy a clean, comfortable, and welcoming dining ambiance designed for memorable meals with family and friends.',
    icon: 'Utensils',
    features: ['Comfortable Seating', 'Warm Hospitality', 'Hygienic Environment'],
  },
  {
    id: 'takeaway',
    title: 'Takeaway',
    description: 'Quick, hot, and securely packed takeaway meals so you can enjoy your favorite flavors at home or on the go.',
    icon: 'ShoppingBag',
    features: ['Fresh & Secure Packaging', 'Quick Preparation', 'Spill-Proof Boxes'],
  },
  {
    id: 'food-ordering',
    title: 'Food Ordering',
    description: 'Call ahead or inquire directly to place your order conveniently for pickup or special meal requests.',
    icon: 'PhoneCall',
    features: ['Direct Phone Ordering', 'Custom Prep Options', 'Freshly Prepared'],
  },
  {
    id: 'family-dining',
    title: 'Family Dining',
    description: 'Spacious seating arrangements and a wide variety of menu choices suitable for all ages and family get-togethers.',
    icon: 'Users',
    features: ['Spacious Tables', 'Kid-Friendly Choices', 'Warm Atmosphere'],
  },
  {
    id: 'restaurant-enquiries',
    title: 'Restaurant Enquiries',
    description: 'Reach out to our team for table reservations, large gathering requests, bulk orders, or menu customizations.',
    icon: 'MessageSquareText',
    features: ['Table Booking Help', 'Bulk Orders', 'Friendly Support'],
  },
];

export const WHY_CHOOSE_US_DATA: WhyChooseItem[] = [
  {
    id: 'delicious-food',
    title: 'Delicious Food',
    description: 'Every dish is crafted with love, aromatic spices, and authentic recipes to give you an unforgettable taste.',
    icon: 'ChefHat',
  },
  {
    id: 'great-value',
    title: 'Great Value',
    description: 'Generous portions, top-grade ingredients, and affordable pricing that make every visit rewarding.',
    icon: 'BadgePercent',
  },
  {
    id: 'comfortable-atmosphere',
    title: 'Comfortable Atmosphere',
    description: 'A relaxed, air-conditioned and hygienic environment where you can unwind and enjoy meals peacefully.',
    icon: 'Sparkles',
  },
  {
    id: 'friendly-service',
    title: 'Friendly Service',
    description: 'Our attentive staff is dedicated to making sure your dining experience is prompt, pleasant, and hospitable.',
    icon: 'HeartHandshake',
  },
  {
    id: 'convenient-location',
    title: 'Convenient Location',
    description: 'Easily accessible at Santosh Bhuvan in Nalasopara East, making it a great spot for lunch, dinner, or snacks.',
    icon: 'MapPin',
  },
  {
    id: 'open-daily',
    title: 'Open Daily',
    description: 'Open 7 days a week from 9:00 AM to 11:00 PM to satisfy your morning snacks, lunch, and dinner cravings.',
    icon: 'Clock',
  },
];
