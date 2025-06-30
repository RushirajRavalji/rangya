import React, { useState } from 'react';
import Image from 'next/image';
import PropTypes from 'prop-types';
import { FiImage } from 'react-icons/fi';

/**
 * OptimizedImage component for optimized image loading with modern formats
 * 
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Image alt text
 * @param {number} props.width - Image width
 * @param {number} props.height - Image height
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.objectFit - Object fit property (cover, contain, etc.)
 * @param {boolean} props.priority - Whether to prioritize loading
 * @param {string} props.quality - Image quality (1-100)
 * @param {boolean} props.lazyLoad - Whether to lazy load the image
 * @param {Array} props.sizes - Responsive sizes attribute
 * @param {string} props.placeholder - Placeholder type ('blur' or 'empty')
 * @param {string} props.blurDataURL - Data URL for blur placeholder
 * @param {Object} props.imgProps - Additional props for the img element
 * @returns {JSX.Element} - Rendered component
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  objectFit = 'cover',
  priority = false,
  quality = 80,
  lazyLoad = true,
  sizes = '100vw',
  placeholder = 'empty',
  blurDataURL,
  imgProps = {},
  ...rest
}) => {
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Default fallback image
  const fallbackImage = '/images/placeholder.jpg';
  
  // Handle image load error
  const handleError = () => {
    if (src !== fallbackImage) {
      setIsError(true);
    }
  };
  
  // Handle image load success
  const handleLoad = () => {
    setIsLoaded(true);
  };
  
  // Determine image source
  const imageSrc = isError ? fallbackImage : src;
  
  // Generate blur data URL for placeholder if not provided
  const generatedBlurDataURL = blurDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2Q4tgFQAAAABJRU5ErkJggg==';
  
  // Determine if we should use blur placeholder
  const usePlaceholder = placeholder === 'blur';
  
  // Check if the image is from Cloudinary
  const isCloudinaryImage = typeof src === 'string' && src.includes('cloudinary.com');
  
  // Modify Cloudinary URLs to use modern formats and optimizations
  let optimizedSrc = imageSrc;
  if (isCloudinaryImage) {
    // Extract base URL and transformations
    const [baseUrl, query] = imageSrc.split('/upload/');
    
    // Add auto format and quality transformations if not already present
    const hasFormat = query.includes('/f_auto/');
    const hasQuality = query.includes('/q_auto/');
    
    let newTransformations = '';
    if (!hasFormat) newTransformations += 'f_auto,';
    if (!hasQuality) newTransformations += 'q_auto,';
    
    // Only modify URL if we have new transformations to add
    if (newTransformations) {
      optimizedSrc = `${baseUrl}/upload/${newTransformations}${query}`;
    }
  }

  return (
    <div
      className={`image-container ${className} ${!isLoaded ? 'image-loading' : 'image-loaded'}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto'
      }}
      {...rest}
    >
      <Image
        src={optimizedSrc}
        alt={alt || 'Image'}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        loading={lazyLoad && !priority ? 'lazy' : undefined}
        sizes={sizes}
        placeholder={usePlaceholder ? 'blur' : 'empty'}
        blurDataURL={usePlaceholder ? generatedBlurDataURL : undefined}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          objectFit,
          objectPosition: 'center',
          transition: 'opacity 0.3s ease',
          opacity: isLoaded ? 1 : 0
        }}
        {...imgProps}
      />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div
          className="image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {placeholder !== 'blur' && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-spin"
            >
              <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="4" />
              <path
                d="M12 2C6.48 2 2 6.48 2 12"
                stroke="#4a6cf7"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.string,
  objectFit: PropTypes.oneOf(['cover', 'contain', 'fill', 'none', 'scale-down']),
  priority: PropTypes.bool,
  quality: PropTypes.number,
  lazyLoad: PropTypes.bool,
  sizes: PropTypes.string,
  placeholder: PropTypes.oneOf(['blur', 'empty']),
  blurDataURL: PropTypes.string,
  imgProps: PropTypes.object
};

export default OptimizedImage; 