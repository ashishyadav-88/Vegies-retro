import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { MenuSection } from './components/MenuSection';
import { ServicesSection } from './components/ServicesSection';
import { WhyChooseUs } from './components/WhyChooseUs';
import { GallerySection } from './components/GallerySection';
import { LocationSection } from './components/LocationSection';
import { ContactCta } from './components/ContactCta';
import { Footer } from './components/Footer';
import { FullMenuModal } from './components/FullMenuModal';
import { InquiryModal } from './components/InquiryModal';
import { OrderFoodModal } from './components/OrderFoodModal';
import { AuthModal } from './components/AuthModal';
import { UserBookingsModal } from './components/UserBookingsModal';
import { AdminPortalModal } from './components/AdminPortalModal';
import { FloatingActions } from './components/FloatingActions';

function MainApp() {
  const [isFullMenuOpen, setIsFullMenuOpen] = useState<boolean>(false);
  const [isInquiryOpen, setIsInquiryOpen] = useState<boolean>(false);
  const [inquiryService, setInquiryService] = useState<string>('Dine-In Table Reservation');
  const [inquiryDish, setInquiryDish] = useState<string>('');

  // Order Food Modal State
  const [isOrderFoodOpen, setIsOrderFoodOpen] = useState<boolean>(false);
  const [orderFoodCategory, setOrderFoodCategory] = useState<string>('all');
  const [orderFoodDish, setOrderFoodDish] = useState<string>('');

  // Auth & Bookings modal state
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authPrompt, setAuthPrompt] = useState<string | undefined>(undefined);
  const [isUserBookingsOpen, setIsUserBookingsOpen] = useState<boolean>(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState<boolean>(false);

  const handleOpenInquiry = (serviceType: string = 'Dine-In Table Reservation') => {
    setInquiryService(serviceType);
    setInquiryDish('');
    setIsInquiryOpen(true);
  };

  const handleOpenInquiryWithDish = (dishName: string) => {
    // Open the dedicated Order Food Modal directly prefilled with the dish
    handleOpenOrderFood('all', dishName);
  };

  const handleOpenOrderFood = (category: string = 'all', dishName: string = '') => {
    setOrderFoodCategory(category);
    setOrderFoodDish(dishName);
    setIsOrderFoodOpen(true);
  };

  const handleOpenFullMenu = () => {
    setIsFullMenuOpen(true);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin', prompt?: string) => {
    setAuthMode(mode);
    setAuthPrompt(prompt);
    setIsAuthOpen(true);
  };

  const handleOpenUserBookings = () => {
    setIsUserBookingsOpen(true);
  };

  const handleOpenAdminPortal = () => {
    setIsAdminPortalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-600 selection:text-white pb-16 lg:pb-0">
      {/* 1. Header Navigation */}
      <Navbar
        onOpenInquiry={handleOpenInquiry}
        onOpenOrderFood={handleOpenOrderFood}
        onOpenFullMenu={handleOpenFullMenu}
        onOpenAuth={handleOpenAuth}
        onOpenUserBookings={handleOpenUserBookings}
        onOpenAdminPortal={handleOpenAdminPortal}
      />

      {/* Main Page Sections */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <Hero
          onOpenInquiry={handleOpenInquiry}
          onOpenOrderFood={handleOpenOrderFood}
        />

        {/* 3. About Section */}
        <About onOpenInquiry={handleOpenInquiry} />

        {/* 4. Menu Section */}
        <MenuSection
          onOpenFullMenu={handleOpenFullMenu}
          onOpenInquiryWithDish={handleOpenInquiryWithDish}
        />

        {/* 5. Services Section */}
        <ServicesSection onOpenInquiry={handleOpenInquiry} />

        {/* 6. Why Choose Us Section */}
        <WhyChooseUs />

        {/* 7. Gallery Section */}
        <GallerySection onOpenInquiryWithDish={handleOpenInquiryWithDish} />

        {/* 8. Location & Directions Section */}
        <LocationSection onOpenInquiry={handleOpenInquiry} />

        {/* 9. Final Call To Action (CTA) */}
        <ContactCta
          onOpenInquiry={handleOpenInquiry}
          onOpenOrderFood={handleOpenOrderFood}
          onOpenFullMenu={handleOpenFullMenu}
          onOpenAuth={handleOpenAuth}
          onOpenUserBookings={handleOpenUserBookings}
        />
      </main>

      {/* 10. Footer */}
      <Footer />

      {/* Mobile Floating Action Bar */}
      <FloatingActions
        onOpenFullMenu={handleOpenFullMenu}
        onOpenInquiry={handleOpenInquiry}
        onOpenOrderFood={() => handleOpenOrderFood()}
      />

      {/* Full Menu Modal */}
      <FullMenuModal
        isOpen={isFullMenuOpen}
        onClose={() => setIsFullMenuOpen(false)}
        onSelectDishForInquiry={handleOpenInquiryWithDish}
      />

      {/* Table Reservation Inquiry Modal */}
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        onOpenAuth={handleOpenAuth}
        onOpenUserBookings={handleOpenUserBookings}
        initialService={inquiryService}
        initialDish={inquiryDish}
      />

      {/* Dedicated Food Order Modal */}
      <OrderFoodModal
        isOpen={isOrderFoodOpen}
        onClose={() => setIsOrderFoodOpen(false)}
        onOpenAuth={handleOpenAuth}
        onOpenUserBookings={handleOpenUserBookings}
        initialCategory={orderFoodCategory}
        initialDish={orderFoodDish}
      />

      {/* Firebase Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        promptMessage={authPrompt}
      />

      {/* User Account & Stored Bookings/Orders History Modal */}
      <UserBookingsModal
        isOpen={isUserBookingsOpen}
        onClose={() => setIsUserBookingsOpen(false)}
        onOpenNewInquiry={() => handleOpenInquiry('Dine-In Table Reservation')}
      />

      {/* Admin Management Portal Modal */}
      <AdminPortalModal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
