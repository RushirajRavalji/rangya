import { db } from '../../utils/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Sample product data
const testProducts = [
  {
    name_en: 'Classic Denim Shirt',
    slug: 'classic-denim-shirt',
    description_en: 'Premium quality denim shirt with classic styling.',
    price: 2499,
    salePrice: 1999,
    category: 'Shirts',
    stock: {
      'S': 10,
      'M': 15,
      'L': 12,
      'XL': 8
    },
    images: [
      'https://via.placeholder.com/800x800?text=Denim+Shirt'
    ],
    badges: ['New', 'Bestseller'],
    details: [
      '100% premium denim',
      'Button-down collar',
      'Regular fit',
      'Machine washable'
    ],
    popularity: 10,
    featured: true
  },
  {
    name_en: 'Slim Fit Denim T-Shirt',
    slug: 'slim-fit-denim-tshirt',
    description_en: 'Comfortable slim fit denim t-shirt for casual wear.',
    price: 1499,
    salePrice: 1299,
    category: 'T-shirts',
    stock: {
      'S': 8,
      'M': 12,
      'L': 10,
      'XL': 6
    },
    images: [
      'https://via.placeholder.com/800x800?text=Denim+TShirt'
    ],
    badges: ['Sale'],
    details: [
      'Soft denim fabric',
      'Slim fit',
      'Crew neck',
      'Machine washable'
    ],
    popularity: 8,
    featured: true
  },
  {
    name_en: 'Relaxed Fit Denim Pants',
    slug: 'relaxed-fit-denim-pants',
    description_en: 'Comfortable relaxed fit denim pants for everyday wear.',
    price: 2999,
    salePrice: 2499,
    category: 'Jeans',
    stock: {
      '30': 10,
      '32': 12,
      '34': 8,
      '36': 6
    },
    images: [
      'https://via.placeholder.com/800x800?text=Denim+Pants'
    ],
    badges: ['New'],
    details: [
      'Premium denim fabric',
      'Relaxed fit',
      'Five-pocket styling',
      'Machine washable'
    ],
    popularity: 9,
    featured: true
  }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log("API: test-add-products endpoint called");
    
    // Check if database is initialized
    if (!db) {
      return res.status(500).json({ 
        error: 'Firebase Firestore not initialized',
        message: 'Please check your Firebase configuration'
      });
    }
    
    // Add products to Firestore
    const addedProducts = [];
    const productsRef = collection(db, 'products');
    
    for (const product of testProducts) {
      try {
        // Add timestamp to each product
        const productWithTimestamp = {
          ...product,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(productsRef, productWithTimestamp);
        console.log(`Product added with ID: ${docRef.id}`);
        
        addedProducts.push({
          id: docRef.id,
          name: product.name_en
        });
      } catch (error) {
        console.error(`Error adding product ${product.name_en}:`, error);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Added ${addedProducts.length} products successfully`,
      products: addedProducts
    });
  } catch (error) {
    console.error('API: Error adding test products:', error);
    
    return res.status(500).json({ 
      error: 'Failed to add test products',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
} 