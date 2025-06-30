import React from 'react';
import { FiMapPin } from 'react-icons/fi';

/**
 * Component for displaying address information consistently across the app
 * 
 * @param {Object} props
 * @param {Object} props.address - The address object to display
 * @param {string} props.title - Optional title for the address section
 * @param {string} props.className - Optional additional classes for the container
 * @param {string} props.customerName - Optional customer name to show at the top
 */
const AddressDisplay = ({ address, title = "Shipping Address", className = "", customerName }) => {
  if (!address) {
    return (
      <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
        <div className="flex items-center mb-2 text-gray-700">
          <FiMapPin className="mr-2" /> {title}
        </div>
        <p>No address information available</p>
      </div>
    );
  }
  
  // Use provided customer name or get from address
  const name = customerName || address.fullName || address.name || 'N/A';
  
  // Build address parts for easy display
  const addressParts = [
    name && { content: name, isBold: true },
    (address.flatNo || address.buildingNo) && { 
      content: `${address.flatNo || address.buildingNo} ${address.buildingName || ''}`.trim() 
    },
    (address.street || address.line1) && { 
      content: address.street || address.line1 
    },
    address.landmark && { content: address.landmark },
    (address.city || address.state) && { 
      content: `${address.city || ''}${address.city && address.state ? ', ' : ''}${address.state || ''}` 
    },
    address.postalCode && { content: address.postalCode },
    address.country && { content: address.country }
  ].filter(Boolean); // Remove falsy items
  
  return (
    <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
      <div className="flex items-center mb-2 text-gray-700">
        <FiMapPin className="mr-2" /> {title}
      </div>
      <div className="space-y-1">
        {addressParts.map((part, index) => (
          <p key={index} className={`text-sm ${part.isBold ? 'font-medium' : ''}`}>
            {part.content}
          </p>
        ))}
        {address.phone && (
          <p className="text-sm mt-1">Phone: {address.phone}</p>
        )}
      </div>
    </div>
  );
};

export default AddressDisplay; 