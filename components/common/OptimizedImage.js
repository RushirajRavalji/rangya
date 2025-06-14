import { useState } from 'react';
import Image from 'next/image';

/**
 * OptimizedImage component with error handling and fallback
 * 
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for the image
 * @param {number} props.width - Image width
 * @param {number} props.height - Image height
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.fallbackSrc - Fallback image URL (optional)
 * @param {Object} props.rest - Additional props passed to the image
 * @returns {React.Component}
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackSrc = 'https://via.placeholder.com/400x400?text=Image+Not+Found',
  ...rest
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isError, setIsError] = useState(false);

  // Handle image loading error
  const handleError = () => {
    if (!isError) {
      setImgSrc(fallbackSrc);
      setIsError(true);
    }
  };

  // For external URLs that aren't in the next.config.js domains list,
  // we need to use a regular img tag
  if (imgSrc.startsWith('http') && 
      !imgSrc.includes('firebasestorage.googleapis.com') && 
      !imgSrc.includes('via.placeholder.com') && 
      !imgSrc.includes('images.unsplash.com') && 
      !imgSrc.includes('plus.unsplash.com')) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        {...rest}
      />
    );
  }

  // Use Next.js Image component for optimized loading
  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      {...rest}
    />
  );
} 