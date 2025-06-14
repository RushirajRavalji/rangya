import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiSave, FiX, FiUpload, FiLoader } from 'react-icons/fi';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { createProduct, uploadProductImage, updateProduct } from '../../../utils/productService';

export default function NewProduct() {
  const router = useRouter();
  const { currentUser, userRole } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [formData, setFormData] = useState({
    name_en: '',
    slug: '',
    description_en: '',
    price: '',
    salePrice: '',
    category: '',
    stock: {
      '28': 0,
      '30': 0,
      '32': 0,
      '34': 0,
      '36': 0,
      '38': 0
    },
    details: ['', '', ''],
    badges: []
  });

  // Listen for product added event
  useEffect(() => {
    const handleProductAdded = (event) => {
      const { productName } = event.detail;
      showNotification(`Product "${productName}" has been added successfully!`, 'success');
    };

    window.addEventListener('productAdded', handleProductAdded);
    
    return () => {
      window.removeEventListener('productAdded', handleProductAdded);
    };
  }, [showNotification]);

  // Check if user is admin
  if (typeof window !== 'undefined' && (!currentUser || userRole !== 'admin')) {
    router.push('/login?redirect=/admin/products');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('stock.')) {
      const size = name.split('.')[1];
      // Convert to integer and ensure it's not negative
      const stockValue = parseInt(value, 10);
      const validStockValue = isNaN(stockValue) ? 0 : Math.max(0, stockValue);
      
      setFormData({
        ...formData,
        stock: {
          ...formData.stock,
          [size]: validStockValue
        }
      });
    } else if (name === 'name_en') {
      // Auto-generate slug from name
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      setFormData({
        ...formData,
        [name]: value,
        slug
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleDetailChange = (index, value) => {
    const updatedDetails = [...formData.details];
    updatedDetails[index] = value;
    
    setFormData({
      ...formData,
      details: updatedDetails
    });
  };

  const addDetailField = () => {
    setFormData({
      ...formData,
      details: [...formData.details, '']
    });
  };

  const removeDetailField = (index) => {
    const updatedDetails = [...formData.details];
    updatedDetails.splice(index, 1);
    
    setFormData({
      ...formData,
      details: updatedDetails
    });
  };

  const handleBadgeToggle = (badge) => {
    const currentBadges = [...formData.badges];
    const badgeIndex = currentBadges.indexOf(badge);
    
    if (badgeIndex === -1) {
      // Add badge
      setFormData({
        ...formData,
        badges: [...currentBadges, badge]
      });
    } else {
      // Remove badge
      currentBadges.splice(badgeIndex, 1);
      setFormData({
        ...formData,
        badges: currentBadges
      });
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 5 images
    if (imageFiles.length + files.length > 5) {
      alert('You can upload a maximum of 5 images');
      return;
    }
    
    // Create preview URLs
    const newImageFiles = [...imageFiles, ...files];
    const newImagePreviewUrls = [...imagePreviewUrls];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImagePreviewUrls.push(reader.result);
        setImagePreviewUrls([...newImagePreviewUrls]);
      };
      reader.readAsDataURL(file);
    });
    
    setImageFiles(newImageFiles);
  };

  const removeImage = (index) => {
    const newImageFiles = [...imageFiles];
    const newImagePreviewUrls = [...imagePreviewUrls];
    
    newImageFiles.splice(index, 1);
    newImagePreviewUrls.splice(index, 1);
    
    setImageFiles(newImageFiles);
    setImagePreviewUrls(newImagePreviewUrls);
  };

  const validateForm = () => {
    if (!formData.name_en.trim()) {
      setError('Product name is required');
      return false;
    }
    
    if (!formData.slug.trim()) {
      setError('Product slug is required');
      return false;
    }
    
    if (!formData.description_en.trim()) {
      setError('Product description is required');
      return false;
    }
    
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      setError('Valid product price is required');
      return false;
    }
    
    if (formData.salePrice && (isNaN(formData.salePrice) || parseFloat(formData.salePrice) <= 0)) {
      setError('Sale price must be a valid number');
      return false;
    }
    
    if (!formData.category.trim()) {
      setError('Product category is required');
      return false;
    }
    
    if (imageFiles.length === 0) {
      setError('At least one product image is required');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Stock values are already numbers, no need to convert
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        details: formData.details.filter(detail => detail.trim() !== ''),
        images: [],
        createdAt: new Date()
      };
      
      console.log("Creating product with data:", productData);
      
      // Create product in Firestore
      const productId = await createProduct(productData);
      console.log("Product created with ID:", productId);
      
      // Upload images
      const imageUrls = [];
      for (const file of imageFiles) {
        console.log("Uploading image:", file.name);
        const imageUrl = await uploadProductImage(file, productId);
        imageUrls.push(imageUrl);
      }
      
      console.log("All images uploaded:", imageUrls);
      
      // Update product with image URLs
      await updateProduct(productId, { images: imageUrls });
      console.log("Product updated with image URLs");
      
      // Reset loading state before redirecting
      setLoading(false);
      
      // Show success message
      alert('Product created successfully!');
      
      // Redirect to product list
      router.push('/admin/products');
      
    } catch (err) {
      console.error('Error creating product:', err);
      setError('Failed to create product. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>Add New Product | Admin | Ranga</title>
        <meta name="description" content="Add a new product" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Add New Product</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <FiX className="inline mr-1" /> Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-indigo-deep text-white rounded-md hover:bg-blue-800 flex items-center"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  Save Product
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div>
                <h2 className="text-lg font-medium mb-4">Product Information</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="name_en"
                    value={formData.name_en}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL)
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used in product URL. Auto-generated from name, but you can customize it.
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description_en"
                    value={formData.description_en}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Regular Price (₹)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Price (₹)
                    </label>
                    <input
                      type="number"
                      name="salePrice"
                      value={formData.salePrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty if not on sale
                    </p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                  >
                    <option value="">Select Category</option>
                    <option value="shirts">Shirts</option>
                    <option value="tshirts">T-Shirts</option>
                    <option value="pants">Pants</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badges
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['New', 'Bestseller', 'Sale', 'Premium', 'Trending'].map(badge => (
                      <label key={badge} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.badges.includes(badge)}
                          onChange={() => handleBadgeToggle(badge)}
                          className="rounded border-gray-300 text-indigo-deep focus:ring-indigo-deep mr-1"
                        />
                        <span className="text-sm text-gray-700">{badge}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div>
                <h2 className="text-lg font-medium mb-4">Product Details & Stock</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Details
                  </label>
                  {formData.details.map((detail, index) => (
                    <div key={index} className="flex mb-2">
                      <input
                        type="text"
                        value={detail}
                        onChange={(e) => handleDetailChange(index, e.target.value)}
                        placeholder={`Detail ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                      />
                      <button
                        type="button"
                        onClick={() => removeDetailField(index)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDetailField}
                    className="text-sm text-indigo-deep hover:text-blue-800"
                  >
                    + Add Detail
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Levels
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.keys(formData.stock).map((size) => (
                      <div key={size} className="mb-4">
                        <label className="block text-sm text-gray-600 mb-1">
                          Size {size}
                        </label>
                        <input
                          type="number"
                          id={`stock-${size}`}
                          name={`stock.${size}`}
                          value={formData.stock[size]}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 mb-4">
                    <div className="text-center">
                      <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-1 text-sm text-gray-600">
                        Drag and drop images here, or click to select files
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB (max 5 images)
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                      >
                        Select Files
                      </label>
                    </div>
                  </div>
                  
                  {imagePreviewUrls.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="h-20 w-20 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 