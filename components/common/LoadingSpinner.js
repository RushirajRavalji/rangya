import { FiLoader } from 'react-icons/fi';

/**
 * Reusable loading spinner component
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner (sm, md, lg, xl)
 * @param {string} props.color - Color of the spinner
 * @param {string} props.text - Optional loading text
 * @param {boolean} props.fullScreen - Whether to display full screen overlay
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.overlayColor - Background color for the overlay
 * @param {string} props.textColor - Color for the loading text
 * @param {boolean} props.inline - Whether to display inline
 * @returns {JSX.Element} Loading spinner component
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'indigo-600', 
  text = '', 
  fullScreen = false,
  className = '',
  overlayColor = 'bg-white bg-opacity-80',
  textColor = 'text-gray-600',
  inline = false
}) => {
  // Size classes
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  // Color classes
  const colorClass = `text-${color}`;
  
  // Container classes
  const containerClasses = fullScreen 
    ? `fixed inset-0 flex items-center justify-center ${overlayColor} z-50` 
    : inline
      ? `inline-flex items-center ${className}`
      : `flex items-center justify-center ${className}`;

  if (inline && text) {
    return (
      <div className={containerClasses}>
        <FiLoader className={`${sizeClasses[size]} ${colorClass} animate-spin mr-2`} />
        <span className={textColor}>{text}</span>
      </div>
    );
  }

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <FiLoader 
          className={`${sizeClasses[size]} ${colorClass} animate-spin`} 
          aria-hidden="true"
        />
        {text && <p className={`mt-2 ${textColor}`}>{text}</p>}
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner; 