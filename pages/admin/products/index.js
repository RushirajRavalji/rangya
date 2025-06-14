import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../utils/firebase';
import { collection, getDocs, doc, deleteDoc, query, orderBy, startAfter, limit, where } from 'firebase/firestore';
import { 
  FiGrid, 
  FiPackage, 
  FiUsers, 
  FiShoppingBag, 
  FiPlusCircle,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiLoader,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiChevronDown,
  FiChevronUp,
  FiList,
  FiArrowDown,
  FiArrowUp,
  FiDownload
} from 'react-icons/fi';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getProducts, deleteProduct } from '../../../utils/productService';
import OptimizedImage from '../../../components/common/OptimizedImage';
import { useReactToPrint } from 'react-to-print';
import { useNotification } from '../../../contexts/NotificationContext';

export default function AdminProducts() {
  const { currentUser, userRole } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const printRef = useRef();
  const { showNotification } = useNotification();

  const productsPerPage = 10;

  useEffect(() => {
    // Redirect if not logged in or not admin
    if (!currentUser) {
      router.push('/login?redirect=/admin/products');
      return;
    }

    const checkAdminAccess = async () => {
      if (userRole !== 'admin') {
        router.push('/account');
        return;
      }

      try {
        // Fetch products
        const fetchProducts = async () => {
          setLoading(true);
          const result = await getProducts({
            limit: 1000,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          });
          
          setProducts(result.products);
          
          // Extract unique categories
          const uniqueCategories = [...new Set(result.products.map(product => product.category))];
          setCategories(uniqueCategories);
          
          setTotalPages(Math.ceil(result.products.length / productsPerPage));
          setLoading(false);
        };
        
        fetchProducts();
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products');
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [currentUser, router, userRole]);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle category filter
  const handleCategoryFilter = (e) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  };

  // Filter products by search term and category
  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      product.name_en?.toLowerCase().includes(searchLower) ||
      product.description_en?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower);
    
    const matchesCategory = categoryFilter ? product.category === categoryFilter : true;
    
    return matchesSearch && matchesCategory;
  });

  // Paginate products
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // Handle PDF export
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Products-List-${new Date().toLocaleDateString()}`,
    onAfterPrint: () => showNotification('Products list exported successfully', 'success')
  });

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      setProcessing(true);
      setError(null);
      
      await deleteProduct(selectedProduct.id);
      
      // Update local state
      setProducts(prevProducts => prevProducts.filter(product => product.id !== selectedProduct.id));
      
      setSuccess('Product deleted successfully');
      setShowDeleteModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentUser || userRole !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <AdminLayout title="Products Management">
      <Head>
        <title>Product Management | Ranga Admin</title>
        <meta name="description" content="Manage products for Ranga e-commerce" />
      </Head>

      {/* Main Content */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Product Management</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="bg-indigo-deep hover:bg-indigo-800 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FiDownload className="mr-2" /> Export PDF
            </button>
            <Link href="/admin/products/new" className="bg-orange-vibrant hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center">
              <FiPlus className="mr-2" />
              Add New Product
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <div className="flex-1 mb-4 md:mb-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-500" />
              <select
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-deep"
                value={categoryFilter}
                onChange={handleCategoryFilter}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p>{success}</p>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto" ref={printRef}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PRODUCT
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CATEGORY
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PRICE
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STOCK
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center">
                        <FiLoader className="animate-spin mr-2" />
                        Loading products...
                      </div>
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-16 w-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden mr-4">
                            {product.images && product.images.length > 0 ? (
                              <OptimizedImage
                                src={product.images[0]}
                                alt={product.name_en}
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name_en}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {product.description_en?.substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₹{product.price}</div>
                        {product.salePrice && (
                          <div className="text-xs text-red-600">Sale: ₹{product.salePrice}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.stock ? (
                          <div>
                            {Object.entries(product.stock).map(([size, quantity]) => (
                              <div key={size} className="text-xs">
                                <span className="font-medium">{size}:</span> {quantity}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-red-600">No stock</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium print:hidden">
                        <Link
                          href={`/admin/products/edit/${product.id}`}
                          className="text-indigo-deep hover:text-indigo-800 mr-3"
                        >
                          <FiEdit className="inline" /> Edit
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiTrash2 className="inline" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 mb-4">No products found matching your criteria.</p>
            <Link href="/admin/products/new" className="text-indigo-deep hover:text-blue-800">
              Add a new product
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    // Calculate total stock
                    const totalStock = product.stock ? 
                      Object.values(product.stock).reduce((sum, qty) => sum + qty, 0) : 0;
                    
                    return (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded">
                              {product.images && product.images[0] ? (
                                <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                                  IMG
                                </div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                                  No IMG
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.name_en}</div>
                              <div className="text-sm text-gray-500">{product.name_hi}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">{product.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">₹{product.price}</div>
                          {product.salePrice && (
                            <div className="text-sm text-red-sale">₹{product.salePrice} (Sale)</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{totalStock} units</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            totalStock > 10 ? 'bg-green-100 text-green-800' :
                            totalStock > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {totalStock > 10 ? 'In Stock' :
                             totalStock > 0 ? 'Low Stock' :
                             'Out of Stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link 
                              href={`/admin/products/edit/${product.id}`}
                              className="text-indigo-deep hover:text-blue-800"
                            >
                              <FiEdit size={18} />
                            </Link>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={processing}
                              className="text-red-500 hover:text-red-700 disabled:opacity-50"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 