import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { placeOrder } from '../utils/orderUtils';
import { useRouter } from 'next/router';
import { useNotification } from '../contexts/NotificationContext';

/**
 * Example component showing how to use the placeOrder function
 * This is just a reference implementation and not meant to be used directly
 */
const PlaceOrderExample = ({ shippingAddress, paymentMethod }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();
  const { cartItems, clearCart, total, subtotal } = useCart();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const handlePlaceOrder = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to place an order', 'error');
      return;
    }
    
    if (cartItems.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Calculate tax and shipping fee
      const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% tax
      const shippingFee = subtotal > 1000 ? 0 : 100; // Free shipping over ₹1000
      const totalAmount = subtotal + shippingFee + tax;
      
      // Prepare order data
      const orderData = {
        userId: currentUser.uid,
        shippingAddress: shippingAddress,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        shippingFee: shippingFee,
        tax: tax,
        totalAmount: totalAmount
      };
      
      // Place the order
      const result = await placeOrder(orderData);
      
      if (result.success) {
        // Clear the cart after successful order placement
        clearCart();
        
        // Show success notification
        showNotification('Order placed successfully!', 'success');
        
        // Redirect to order confirmation page
        router.push(`/order-confirmation?id=${result.orderId}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      showNotification(error.message || 'Failed to place order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      {/* Order summary and checkout button */}
      <button
        onClick={handlePlaceOrder}
        disabled={isSubmitting || cartItems.length === 0}
        className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {isSubmitting ? 'Processing...' : 'Place Order'}
      </button>
    </div>
  );
};

export default PlaceOrderExample;