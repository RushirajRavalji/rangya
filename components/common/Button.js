import { FiLoader } from 'react-icons/fi';

/**
 * Reusable button component with loading state
 * @param {Object} props - Component props
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.variant - Button variant (primary, secondary, outline, danger, success, link)
 * @param {string} props.size - Button size (xs, sm, md, lg, xl)
 * @param {boolean} props.isLoading - Whether button is in loading state
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler
 * @param {string} props.loadingText - Text to show when loading
 * @param {string} props.ariaLabel - Accessible label
 * @param {React.ReactNode} props.children - Button content
 * @param {React.ReactNode} props.icon - Optional icon to display
 * @param {string} props.iconPosition - Position of the icon (left or right)
 * @returns {JSX.Element} Button component
 */
const Button = ({
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  loadingText,
  ariaLabel,
  children,
  icon,
  iconPosition = 'left',
  ...rest
}) => {
  // Variant classes
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    outline: 'bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    link: 'bg-transparent text-indigo-600 hover:text-indigo-800 hover:underline p-0 focus:ring-indigo-500'
  };

  // Size classes
  const sizeClasses = {
    xs: 'py-1 px-2 text-xs',
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
    xl: 'py-4 px-8 text-xl'
  };

  // Disabled classes
  const disabledClasses = (disabled || isLoading)
    ? 'opacity-60 cursor-not-allowed'
    : 'transition-colors duration-200';

  // Base button classes
  const buttonClasses = variant === 'link' 
    ? `font-medium focus:outline-none ${variantClasses[variant]} ${disabledClasses} ${className}`
    : `rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={isLoading}
      {...rest}
    >
      <div className="flex items-center justify-center">
        {isLoading && (
          <>
            <FiLoader className="animate-spin" aria-hidden="true" />
            <span className={loadingText ? "ml-2" : "sr-only"}>
              {loadingText || "Loading..."}
            </span>
          </>
        )}
        
        {!isLoading && (
          <>
            {icon && iconPosition === 'left' && (
              <span className="mr-2">{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className="ml-2">{icon}</span>
            )}
          </>
        )}
      </div>
    </button>
  );
};

export default Button; 