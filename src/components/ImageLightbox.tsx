import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export type GalleryImage = {
  src: string;
  title?: string;
  description?: string;
};

type ImageLightboxProps = {
  images: GalleryImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export default function ImageLightbox({ images, index, onClose, onNavigate }: ImageLightboxProps) {
  const isOpen = index !== null;
  const current = index !== null ? images[index] : null;
  const [isZoomed, setIsZoomed] = useState(false);

  // Zooming in is per-image — don't carry it over when navigating or reopening.
  useEffect(() => {
    setIsZoomed(false);
  }, [index]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate(((index as number) + 1) % images.length);
      if (e.key === 'ArrowLeft') onNavigate(((index as number) - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, index, images.length, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {isOpen && current && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={current.title ? `${current.title} screenshot` : 'Screenshot preview'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={22} />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(((index as number) - 1 + images.length) % images.length);
                }}
                aria-label="Previous screenshot"
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(((index as number) + 1) % images.length);
                }}
                aria-label="Next screenshot"
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <motion.div
            key={current.src}
            className="flex max-h-full max-w-5xl flex-col items-center"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex max-h-[75vh] max-w-full items-center justify-center ${isZoomed ? 'overflow-auto' : ''}`}
            >
              <img
                src={current.src}
                alt={current.title ?? ''}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed((z) => !z);
                }}
                title={isZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                className={`max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200 ${
                  isZoomed ? 'scale-[2] cursor-zoom-out' : 'cursor-zoom-in'
                }`}
              />
            </div>
            {(current.title || current.description) && (
              <div className="mt-4 max-w-2xl text-center">
                {current.title && <h3 className="font-semibold text-white">{current.title}</h3>}
                {current.description && <p className="mt-1 text-sm text-gray-300">{current.description}</p>}
              </div>
            )}
            {images.length > 1 && (
              <p className="mt-3 text-xs text-gray-400">
                {(index as number) + 1} / {images.length}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
