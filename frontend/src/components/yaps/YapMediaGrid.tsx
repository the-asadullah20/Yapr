import React, { useState } from 'react';
import { LightboxModal } from '../common/LightboxModal';

interface YapMediaGridProps {
  media: string[];
}

export const YapMediaGrid: React.FC<YapMediaGridProps> = ({ media }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!media || media.length === 0) return null;

  const openLightbox = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(index);
  };

  return (
    <>
      {media.length === 1 && (
        <div
          onClick={(e) => openLightbox(0, e)}
          className="mt-3 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black/5 dark:bg-black/40 flex items-center justify-center cursor-pointer group"
        >
          <img
            src={media[0]}
            alt="Yap media"
            className="w-full max-h-[520px] object-contain group-hover:opacity-95 transition-all duration-200"
            loading="lazy"
          />
        </div>
      )}

      {media.length === 2 && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[350px]">
          {media.map((url, i) => (
            <div
              key={i}
              onClick={(e) => openLightbox(i, e)}
              className="h-[280px] overflow-hidden cursor-pointer group bg-black/5 dark:bg-black/40 flex items-center justify-center"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* 3 Images: Left tall vertical, right 2 stacked */}
      {media.length === 3 && (
        <div className="mt-3 grid grid-cols-12 gap-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[400px]">
          <div
            onClick={(e) => openLightbox(0, e)}
            className="col-span-7 h-[380px] cursor-pointer group overflow-hidden bg-black/5 dark:bg-black/40"
          >
            <img
              src={media[0]}
              alt=""
              className="w-full h-full object-cover rounded-l-xl group-hover:scale-[1.01] transition-transform duration-300"
              loading="lazy"
            />
          </div>
          <div className="col-span-5 flex flex-col gap-2 h-[380px]">
            <div
              onClick={(e) => openLightbox(1, e)}
              className="h-[185px] cursor-pointer group overflow-hidden bg-black/5 dark:bg-black/40"
            >
              <img
                src={media[1]}
                alt=""
                className="w-full h-full object-cover rounded-tr-xl group-hover:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div
              onClick={(e) => openLightbox(2, e)}
              className="h-[185px] cursor-pointer group overflow-hidden bg-black/5 dark:bg-black/40"
            >
              <img
                src={media[2]}
                alt=""
                className="w-full h-full object-cover rounded-br-xl group-hover:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4 or more */}
      {media.length >= 4 && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[380px]">
          {media.slice(0, 4).map((url, i) => (
            <div
              key={i}
              onClick={(e) => openLightbox(i, e)}
              className="h-[185px] cursor-pointer group overflow-hidden bg-black/5 dark:bg-black/40 relative"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover rounded-xl group-hover:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
              {i === 3 && media.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-bold rounded-xl">
                  +{media.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Lightbox for 100% original length view */}
      <LightboxModal
        images={media}
        initialIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
};
