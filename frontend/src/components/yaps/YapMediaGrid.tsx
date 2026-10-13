import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { LightboxModal } from '../common/LightboxModal';
import { AutoPauseVideo } from '../common/AutoPauseVideo';
import { isVideoUrl } from '../../utils/formatters';

interface YapMediaGridProps {
  media: string[];
}

const MediaGridCell: React.FC<{
  url: string;
  index: number;
  onClick: (index: number, e: React.MouseEvent) => void;
  className?: string;
  extraOverlay?: React.ReactNode;
}> = ({ url, index, onClick, className = '', extraOverlay }) => {
  const isVideo = isVideoUrl(url);

  return (
    <div
      onClick={(e) => onClick(index, e)}
      className={`relative cursor-pointer group overflow-hidden bg-black/5 dark:bg-black/40 flex items-center justify-center ${className}`}
    >
      {isVideo ? (
        <>
          <video
            src={url}
            muted
            playsInline
            preload="metadata"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300 pointer-events-none"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/15 transition-colors pointer-events-none">
            <div className="p-2 sm:p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white shadow-md">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />
      )}
      {extraOverlay}
    </div>
  );
};

export const YapMediaGrid: React.FC<YapMediaGridProps> = ({ media }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!media || media.length === 0) return null;

  const openLightbox = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(index);
  };

  return (
    <>
      {/* 1 Media item */}
      {media.length === 1 && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black/5 dark:bg-black/40 flex items-center justify-center relative">
          {isVideoUrl(media[0]) ? (
            <AutoPauseVideo
              src={media[0]}
              controls
              playsInline
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[520px] rounded-2xl bg-black"
            />
          ) : (
            <div
              onClick={(e) => openLightbox(0, e)}
              className="w-full cursor-pointer group flex items-center justify-center"
            >
              <img
                src={media[0]}
                alt="Yap media"
                className="w-full max-h-[520px] object-contain group-hover:opacity-95 transition-all duration-200"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      {/* 2 Media items */}
      {media.length === 2 && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[350px]">
          {media.map((url, i) => (
            <MediaGridCell
              key={i}
              url={url}
              index={i}
              onClick={openLightbox}
              className="h-[280px]"
            />
          ))}
        </div>
      )}

      {/* 3 Media items: Left tall vertical, right 2 stacked */}
      {media.length === 3 && (
        <div className="mt-3 grid grid-cols-12 gap-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[400px]">
          <div className="col-span-7 h-[380px]">
            <MediaGridCell
              url={media[0]}
              index={0}
              onClick={openLightbox}
              className="h-full rounded-l-xl"
            />
          </div>
          <div className="col-span-5 flex flex-col gap-2 h-[380px]">
            <MediaGridCell
              url={media[1]}
              index={1}
              onClick={openLightbox}
              className="h-[185px] rounded-tr-xl"
            />
            <MediaGridCell
              url={media[2]}
              index={2}
              onClick={openLightbox}
              className="h-[185px] rounded-br-xl"
            />
          </div>
        </div>
      )}

      {/* 4 or more */}
      {media.length >= 4 && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 max-h-[380px]">
          {media.slice(0, 4).map((url, i) => (
            <MediaGridCell
              key={i}
              url={url}
              index={i}
              onClick={openLightbox}
              className="h-[185px] rounded-xl"
              extraOverlay={
                i === 3 && media.length > 4 ? (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white text-lg font-bold rounded-xl pointer-events-none">
                    +{media.length - 4}
                  </div>
                ) : undefined
              }
            />
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
