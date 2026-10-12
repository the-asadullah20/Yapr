import React, { useEffect, useRef } from 'react';

interface AutoPauseVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  autoPauseOutOfView?: boolean;
}

/**
 * Reusable video component that automatically pauses playback when scrolled
 * out of the viewport (or when switching browser tabs), preventing background audio.
 */
export const AutoPauseVideo = React.forwardRef<HTMLVideoElement, AutoPauseVideoProps>(
  ({ autoPauseOutOfView = true, className = '', ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLVideoElement | null>(null);

    const setRef = (node: HTMLVideoElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      }
    };

    useEffect(() => {
      const video = internalRef.current;
      if (!video || !autoPauseOutOfView) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // When video is scrolled out of viewport (below 25% visible), pause it immediately
            if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
              if (!video.paused) {
                video.pause();
              }
            }
          });
        },
        {
          threshold: [0, 0.25],
        }
      );

      observer.observe(video);

      const handleVisibilityChange = () => {
        if (document.hidden && !video.paused) {
          video.pause();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [autoPauseOutOfView]);

    return <video ref={setRef} className={className} {...props} />;
  }
);

AutoPauseVideo.displayName = 'AutoPauseVideo';
