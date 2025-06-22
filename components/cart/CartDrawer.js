import { useRouter } from 'next/router';
import { FiX, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import OptimizedImage from '../common/OptimizedImage';
import { isBase64Image } from '../../utils/imageUtils';

const CartDrawer = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { 
    cartItems, 
    loading, 
    discount, 
    promoCode, 
    subtotal, 
    discountAmount, 
    total,
    updateQuantity, 
    removeItem, 
    applyPromoCode 
  } = useCart();
  
  const handleApplyPromoCode = async () => {
    const result = await applyPromoCode(promoCode);
    if (result.success) {
      alert(`Promo code applied: ${result.discount}% discount`);
    } else {
      alert(result.message || 'Invalid promo code');
    }
  };

  const proceedToCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <div 
      className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`absolute top-0 right-0 h-full w-full sm:w-96 bg-white shadow-xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="px-4 py-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <FiShoppingBag className="mr-2" /> Your Cart
          </h2>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close cart"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-grow overflow-y-auto py-4 px-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p>Loading your cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <FiShoppingBag size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">Your cart is empty</p>
              <button 
                className="text-indigo-deep hover:text-blue-800"
                onClick={onClose}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {cartItems.map((item, index) => (
                <li key={`${item.id}-${item.size}`} className="py-6">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden mr-4">
                      {item.image ? (
                        <img 
                          src={isBase64Image(item.image) ? item.image : `/images/products/${item.image}`} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-500 text-sm">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">Size: {item.size}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-sm font-medium">₹{item.price}</span>
                        {item.price !== item.originalPrice && (
                          <span className="ml-2 text-xs text-gray-500 line-through">₹{item.originalPrice}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button 
                          className="px-2 py-1 text-gray-500 hover:text-gray-700"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="px-2 text-sm">{item.quantity}</span>
                        <button 
                          className="px-2 py-1 text-gray-500 hover:text-gray-700"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => removeItem(index)}
                        aria-label="Remove item"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="px-4 py-6 border-t border-gray-200 bg-gray-50">
            {/* Promo Code */}
            <div className="flex mb-4">
              <input
                type="text"
                placeholder="Promo code"
                className="flex-1 border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button 
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-r hover:bg-gray-300"
                onClick={handleApplyPromoCode}
              >
                Apply
              </button>
            </div>
            
            {/* Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount ({discount}%)</span>
                  <span className="font-medium text-green-success">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-medium pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button 
              className="w-full mt-4 bg-indigo-deep text-white py-2 px-4 rounded-md hover:bg-blue-800 transition-colors duration-200"
              onClick={proceedToCheckout}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer; 