export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price?: string; // Optional or customizable placeholder
  isVegetarian: boolean;
  isChefSpecial?: boolean;
  isPopular?: boolean;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy';
  image: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  itemCount: number;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
}

export interface WhyChooseItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image: string;
  alt: string;
}

export interface RestaurantInfo {
  name: string;
  tagline: string;
  category: string;
  phone: string;
  formattedPhone: string;
  address: {
    landmark: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    full: string;
  };
  hours: {
    open: string;
    close: string;
    display: string;
    days: string;
  };
  googleMapsUrl: string;
  whatsappUrl: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role?: 'admin' | 'customer';
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface BookingInquiry {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  serviceType: string;
  guests: string;
  timeSlot: string;
  customDish?: string;
  notes?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string;
  referenceId: string;
}
