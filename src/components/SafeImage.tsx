import React, { useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fallbackIconClassName?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackSrc,
  fallbackIconClassName,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = () => {
    if (fallbackSrc && src !== fallbackSrc) {
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 text-2xs font-semibold uppercase tracking-wider ${className}`}
        aria-label={alt || 'Image unavailable'}
      >
        <span>Visual Reference</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={() => setIsLoaded(true)}
      className={`${className} ${!isLoaded ? 'opacity-90' : 'opacity-100'} transition-opacity duration-200`}
      {...props}
    />
  );
};

