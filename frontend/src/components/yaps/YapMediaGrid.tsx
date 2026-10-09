import React from 'react';

interface YapMediaGridProps {
  media: string[];
}

export const YapMediaGrid: React.FC<YapMediaGridProps> = ({ media }) => {
  if (!media || media.length === 0) return null;

  if (media.length === 1) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 max-h-[450px]">
        <img
          src={media[0]}
          alt="Yap media"
          className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300"
          loading="lazy"
        />
      </div>
    );
  }

  if (media.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-100 max-h-[350px]">
        {media.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300 max-h-[350px]"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  // 3 Images (Exact matching layout from Image 1: Left tall vertical, right 2 stacked horizontal)
  if (media.length === 3) {
    return (
      <div className="mt-3 grid grid-cols-12 gap-2.5 rounded-2xl overflow-hidden border border-slate-100 max-h-[400px]">
        <div className="col-span-7 h-[380px]">
          <img
            src={media[0]}
            alt=""
            className="w-full h-full object-cover rounded-xl hover:scale-[1.01] transition-transform duration-300"
            loading="lazy"
          />
        </div>
        <div className="col-span-5 flex flex-col gap-2.5 h-[380px]">
          <div className="h-[185px]">
            <img
              src={media[1]}
              alt=""
              className="w-full h-full object-cover rounded-xl hover:scale-[1.01] transition-transform duration-300"
              loading="lazy"
            />
          </div>
          <div className="h-[185px]">
            <img
              src={media[2]}
              alt=""
              className="w-full h-full object-cover rounded-xl hover:scale-[1.01] transition-transform duration-300"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    );
  }

  // 4 or more
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-slate-100 max-h-[380px]">
      {media.slice(0, 4).map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="w-full h-[185px] object-cover rounded-xl hover:scale-[1.01] transition-transform duration-300"
          loading="lazy"
        />
      ))}
    </div>
  );
};
