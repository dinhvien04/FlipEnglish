import React, { useState, useEffect } from 'react';

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fallbackText?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackSrc,
  fallbackText = 'Visual unavailable offline',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [failed, setFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronize when src prop changes
  useEffect(() => {
    setCurrentSrc(src);
    setFailed(false);
    setIsLoaded(false);
  }, [src]);

  // Listen to network online event to automatically retry uncached remote images
  useEffect(() => {
    const handleOnline = () => {
      if (failed && src) {
        setFailed(false);
        setCurrentSrc(src);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [failed, src]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoaded(false);
    } else {
      setFailed(true);
    }
  };

  if (failed || !currentSrc) {
    return (
      <div
        className={`bg-slate-100 flex items-center justify-center text-center p-3 border border-slate-200/60 rounded-xl transition-colors ${className}`}
        aria-label={alt || fallbackText}
        role="img"
      >
        <span className="text-2xs sm:text-xs font-semibold text-slate-400 select-none">
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={() => setIsLoaded(true)}
      className={`${className} ${!isLoaded ? 'opacity-90' : 'opacity-100'} transition-opacity duration-200`}
      {...props}
    />
  );
};
