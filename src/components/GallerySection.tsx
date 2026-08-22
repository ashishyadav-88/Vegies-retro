import React, { useState } from 'react';
import { GALLERY_DATA } from '../data/galleryData';
import { GalleryItem } from '../types';
import {
  Camera,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Phone,
  Utensils,
} from 'lucide-react';
import { RESTAURANT_INFO } from '../data/restaurantData';

interface GallerySectionProps {
  onOpenInquiryWithDish?: (dishName: string) => void;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  onOpenInquiryWithDish,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const categories = ['All', 'Starters', 'Main Course', 'Chinese Food', 'Snacks', 'Beverages', 'Ambiance'];

  const filteredPhotos = GALLERY_DATA.filter((item) => {
    if (activeCategory === 'All') return true;
    return item.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const openLightbox = (item: GalleryItem) => {
    const index = GALLERY_DATA.findIndex((p) => p.id === item.id);
    setSelectedPhoto(item);
    setSelectedIndex(index);
  };

  const nextPhoto = () => {
    const nextIdx = (selectedIndex + 1) % GALLERY_DATA.length;
    setSelectedIndex(nextIdx);
    setSelectedPhoto(GALLERY_DATA[nextIdx]);
  };

  const prevPhoto = () => {
    const prevIdx = (selectedIndex - 1 + GALLERY_DATA.length) % GALLERY_DATA.length;
    setSelectedIndex(prevIdx);
    setSelectedPhoto(GALLERY_DATA[prevIdx]);
  };

  return (
    <section id="gallery" className="py-20 bg-stone-50/70 relative border-t border-stone-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-3">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Visual Showcase</span>
          </div>
          <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Food & Restaurant Gallery
          </h2>
          <p className="text-base sm:text-lg text-stone-600 mt-3">
            Take a look at some of our freshly prepared dishes, refreshing coolers, and welcoming dining space at Vegies Restro.
          </p>
        </div>

        {/* Gallery Filter Pills */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`gallery-filter-${cat.toLowerCase().replace(' ', '-')}`}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-800/20'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Responsive Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((item) => (
            <div
              key={item.id}
              id={`gallery-item-${item.id}`}
              onClick={() => openLightbox(item)}
              className="group relative rounded-3xl overflow-hidden bg-stone-900 aspect-[4/3] cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-200"
            >
              {/* Image */}
              <img
                src={item.image}
                alt={item.alt}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />

              {/* Hover Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Category Pill Top Left */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20">
                  {item.category}
                </span>
              </div>

              {/* View Icon Top Right */}
              <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-4 h-4" />
              </div>

              {/* Bottom Details */}
              <div className="absolute bottom-4 inset-x-4 text-left">
                <h3 className="font-['Outfit',sans-serif] text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-stone-300 text-xs mt-1 line-clamp-1">
                  {item.alt}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Lightbox / Modal View */}
      {selectedPhoto && (
        <div
          id="gallery-lightbox-modal"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              id="lightbox-close-btn"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              aria-label="Close image modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev/Next Buttons */}
            <button
              type="button"
              id="lightbox-prev-btn"
              onClick={prevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              id="lightbox-next-btn"
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Modal Image */}
            <div className="w-full h-80 sm:h-[480px] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.alt}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Bottom Modal Bar */}
            <div className="p-5 bg-stone-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-left border-t border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {selectedPhoto.category}
                  </span>
                  <span className="text-stone-600">•</span>
                  <span className="text-xs text-stone-400">
                    Photo {selectedIndex + 1} of {GALLERY_DATA.length}
                  </span>
                </div>
                <h3 className="font-['Outfit',sans-serif] text-lg font-bold text-white mt-1">
                  {selectedPhoto.title}
                </h3>
              </div>

              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Call to Order</span>
                </a>

                {onOpenInquiryWithDish && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhoto(null);
                      onOpenInquiryWithDish(selectedPhoto.title);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Inquire Dish
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
