import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiImage } from 'react-icons/fi';

/**
 * OptimizedImage component for efficient image loading with fallback
 * 
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alternative text for the image
 * @param {number} props.width - Image width
 * @param {number} props.height - Image height
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.objectFit - CSS object-fit property
 * @param {string} props.objectPosition - CSS object-position property
 * @param {boolean} props.priority - Whether to prioritize loading this image
 * @param {string} props.quality - Image quality (1-100)
 * @param {boolean} props.unoptimized - Whether to skip optimization
 * @param {Function} props.onLoad - Callback when image loads successfully
 * @param {Function} props.onError - Callback when image fails to load
 * @param {string} props.placeholder - Placeholder type ('blur', 'empty', or React node)
 * @param {string} props.blurDataURL - Base64 encoded image data for blur placeholder
 * @returns {JSX.Element} Optimized image component
 */
const OptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  objectFit = 'cover',
  objectPosition = 'center',
  priority = false,
  quality = 75,
  unoptimized = false,
  onLoad,
  onError,
  placeholder = 'empty',
  blurDataURL,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;
  
  // Reset states when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setImageSrc(src);
    setRetryCount(0);
  }, [src]);
  
  // Handle image load success
  const handleLoad = (e) => {
    setIsLoading(false);
    if (onLoad) onLoad(e);
  };
  
  // Handle image load error
  const handleError = (e) => {
    // If we haven't exceeded retry attempts, try to load a smaller version
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      
      // Try to use a smaller version if available
      if (src?.includes('/products/') && !src.includes('-sm.')) {
        const smallSrc = src.replace(/(\.\w+)$/, '-sm$1');
        setImageSrc(smallSrc);
        return;
      }
    }
    
    // If retries exceeded or no smaller version available
    setIsLoading(false);
    setHasError(true);
    
    // Use fallback image
    setImageSrc('/images/placeholder.jpg');
    
    if (onError) onError(e);
  };
  
  // Generate blur data URL for images without one
  const getBlurDataURL = () => {
    // If provided, use it
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple blur data URL (light gray)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  };
  
  // Common image props
  const imageProps = {
    src: imageSrc,
    alt,
    width: width || (height ? undefined : 500),
    height: height || (width ? undefined : 500),
    layout: (!width && !height) ? 'fill' : 'intrinsic',
    objectFit,
    objectPosition,
    priority,
    loading: priority ? 'eager' : 'lazy',
    quality,
    onLoad: handleLoad,
    onError: handleError,
    unoptimized,
    placeholder: placeholder === 'blur' ? 'blur' : undefined,
    blurDataURL: placeholder === 'blur' ? getBlurDataURL() : undefined,
    ...props
  };
  
  // Placeholder shown while loading
  const renderPlaceholder = () => (
    <div 
      className={`bg-gray-100 flex items-center justify-center ${className}`}
      style={{ width: width || '100%', height: height || '100%' }}
      aria-hidden="true"
    >
      <FiImage className="text-gray-400 w-8 h-8" />
    </div>
  );
  
  // Show placeholder while loading
  if (isLoading && !priority && placeholder !== 'blur') {
    return (
      <div className="relative">
        {renderPlaceholder()}
        <div className="absolute inset-0 opacity-0">
          <Image {...imageProps} />
        </div>
      </div>
    );
  }
  
  // Show error state
  if (hasError) {
    return (
      <div className="relative" aria-label={`Failed to load image: ${alt}`}>
        <Image 
          {...imageProps}
          className={`${className} ${hasError ? 'opacity-70' : ''}`}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-30">
          <FiImage className="text-gray-500 w-6 h-6" />
        </div>
      </div>
    );
  }
  
  // Show the image
  return (
    <div className="relative">
      <Image 
        {...imageProps}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
      {isLoading && placeholder !== 'blur' && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
    </div>
  );
};

export default OptimizedImage; 