import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Star, Heart, Sparkles, Gem, type LucideIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// Static image sources — texts come from translations
const categoryIcons: LucideIcon[] = [Star, Heart, Sparkles, Gem, Star];
const imageSrcs: string[][] = [
  [
    '/images/A Divine Encounter/Encouter1.jpeg',
    '/images/A Divine Encounter/Encouter2.jpeg',
    '/images/A Divine Encounter/Encouter3.jpeg',
  ],
  [
    '/images/Love Takes Root/Love1.jpeg',
    '/images/Love Takes Root/Love2.jpeg',
    '/images/Love Takes Root/Love3.jpeg',
  ],
  [
    '/images/A Divine Encounter/WhatsApp Image 2026-04-12 at 11.18.34 PM (1).jpeg',
    '/images/A Divine Encounter/Convenant2.jpeg',
    '/images/A Divine Encounter/Convenant3.jpeg',
  ],
  [
    '/images/Dowry Presentation/WhatsApp Image 2026-04-14 at 11.40.09 AM.jpeg',
    '/images/Dowry Presentation/WhatsApp Image 2026-04-14 at 11.40.11 AM.jpeg',
    '/images/Dowry Presentation/WhatsApp Image 2026-04-14 at 11.40.05 AM.jpeg',
  ],
  [
    '/images/Dowry Presentation/WhatsApp Image 2026-04-14 at 11.40.12 AM.jpeg',
    '/images/Dowry Presentation/WhatsApp Image 2026-04-14 at 11.40.08 AM.jpeg',
    '/images/Dowry Presentation/WhatsApp Image 2026-04-14 at 11.40.10 AM.jpeg',
  ],
];

interface SelectedImage {
  src: string;
  alt: string;
  title: string;
  categoryIndex: number;
  imageIndex: number;
}

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const { t } = useLanguage();
  const { categories } = t.gallery;

  const getImageData = (catIdx: number, imgIdx: number) => ({
    src: imageSrcs[catIdx][imgIdx],
    alt: categories[catIdx].images[imgIdx].alt,
    title: categories[catIdx].images[imgIdx].title,
    categoryIndex: catIdx,
    imageIndex: imgIdx,
  });

  const navigateToPreviousImage = () => {
    if (!selectedImage) return;
    const { categoryIndex, imageIndex } = selectedImage;
    if (imageIndex > 0) {
      setSelectedImage(getImageData(categoryIndex, imageIndex - 1));
    } else if (categoryIndex > 0) {
      const prevLen = imageSrcs[categoryIndex - 1].length;
      setSelectedImage(getImageData(categoryIndex - 1, prevLen - 1));
    }
  };

  const navigateToNextImage = () => {
    if (!selectedImage) return;
    const { categoryIndex, imageIndex } = selectedImage;
    if (imageIndex < imageSrcs[categoryIndex].length - 1) {
      setSelectedImage(getImageData(categoryIndex, imageIndex + 1));
    } else if (categoryIndex < imageSrcs.length - 1) {
      setSelectedImage(getImageData(categoryIndex + 1, 0));
    }
  };

  return (
    <section id="gallery" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-navy/10 via-black to-black" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="font-cormorant text-gold/60 text-sm tracking-widest uppercase">
            {t.gallery.eyebrow}
          </span>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {t.gallery.title}
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <p className="font-cormorant text-white/40 text-base italic">
            {t.gallery.eyebrow} · 2022, 2026
          </p>
        </div>

        <div className="space-y-12">
          {categories.map((category, catIdx) => {
            const Icon = categoryIcons[catIdx];
            return (
              <div key={category.year} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full border-2 border-gold/50 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-2xl font-bold text-white">{category.title}</h3>
                    <p className="font-cormorant text-gold/60 text-sm">{category.year}</p>
                    <p className="font-cormorant text-white/50 text-sm mt-1">{category.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.images.map((img, imgIdx) => (
                    <button
                      key={`${catIdx}-${imgIdx}`}
                      onClick={() => setSelectedImage(getImageData(catIdx, imgIdx))}
                      className="group relative overflow-hidden rounded-xl border border-gold/20 hover:border-gold/50 transition-all duration-300 h-64 cursor-pointer"
                    >
                      <img
                        src={imageSrcs[catIdx][imgIdx]}
                        alt={img.alt}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-start p-4">
                        <p className="font-cormorant text-gold text-sm font-semibold">{img.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center font-cormorant text-white/40 text-base italic mt-12">
          {t.gallery.eyebrow}
        </p>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-3 md:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 text-white/60 hover:text-gold transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); navigateToPreviousImage(); }}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold transition-colors z-10 group"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-12 h-12 group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); navigateToNextImage(); }}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold transition-colors z-10 group"
            aria-label="Next image"
          >
            <ChevronRight className="w-12 h-12 group-hover:scale-110 transition-transform" />
          </button>

          <div
            className="w-full max-w-6xl max-h-[92vh] rounded-2xl overflow-hidden border border-gold/30 flex flex-col bg-black/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="max-w-full max-h-[68vh] md:max-h-[74vh] w-auto h-auto object-contain"
              />
            </div>
            <div className="bg-black/60 backdrop-blur-sm px-6 py-4 border-t border-gold/20">
              <p className="font-cormorant text-gold text-lg font-semibold">{selectedImage.title}</p>
              <p className="font-cormorant text-white/50 text-sm mt-1">{selectedImage.alt}</p>
              <p className="font-cormorant text-white/30 text-xs mt-2">
                {categories[selectedImage.categoryIndex].year} ·{' '}
                {categories[selectedImage.categoryIndex].title}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {imageSrcs[selectedImage.categoryIndex].map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 transition-all ${
                        idx === selectedImage.imageIndex ? 'bg-gold w-6' : 'bg-gold/30 w-2'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-cormorant text-white/40 text-xs ml-auto">
                  {selectedImage.imageIndex + 1} / {imageSrcs[selectedImage.categoryIndex].length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
