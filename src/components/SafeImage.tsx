import React, { useState, useEffect } from 'react';

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackSrc,
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
        className={`bg-slate-100 transition-colors ${className}`}
        aria-label={alt || undefined}
        role="presentation"
      />
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
