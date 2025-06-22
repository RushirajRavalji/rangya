const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, serverTimestamp } = require('firebase/firestore');
require('dotenv').config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD_spb43jww6Pl9OFpIOMzg2LFrH-VbasQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nikhils-jeans-website.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nikhils-jeans-website",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nikhils-jeans-website.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "89588207516",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:89588207516:web:0cfbe407bb6d7cc8764259",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ZHMF1GS857"
};

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
  },
  {
    name_en: 'Stonewashed Denim Jacket',
    slug: 'stonewashed-denim-jacket',
    description_en: 'Classic stonewashed denim jacket with a vintage look.',
    price: 3499,
    salePrice: 2999,
    category: 'Jackets',
    stock: {
      'S': 5,
      'M': 8,
      'L': 10,
      'XL': 7,
      'XXL': 4
    },
    images: [
      'https://via.placeholder.com/800x800?text=Denim+Jacket'
    ],
    badges: ['Bestseller'],
    details: [
      'Premium stonewashed denim',
      'Button front closure',
      'Multiple pockets',
      'Classic fit',
      'Machine washable'
    ],
    popularity: 9,
    featured: true
  },
  {
    name_en: 'Slim Fit Dark Wash Jeans',
    slug: 'slim-fit-dark-wash-jeans',
    description_en: 'Premium dark wash slim fit jeans for a modern look.',
    price: 2799,
    salePrice: 2299,
    category: 'Jeans',
    stock: {
      '30': 8,
      '32': 15,
      '34': 10,
      '36': 5
    },
    images: [
      'https://via.placeholder.com/800x800?text=Dark+Wash+Jeans'
    ],
    badges: ['Popular'],
    details: [
      'Premium denim',
      'Slim fit',
      'Dark wash finish',
      'Five-pocket styling',
      'Machine washable'
    ],
    popularity: 10,
    featured: true
  }
];

// Initialize Firebase
async function initTestData() {
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    console.log('Checking for existing products...');
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing products. Skipping seeding.`);
      console.log('If you want to add more test products, use the admin test page.');
      return;
    }
    
    console.log('No existing products found. Adding test products...');
    const addedProducts = [];
    
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
    
    console.log(`Successfully added ${addedProducts.length} products.`);
    console.log('Added products:', addedProducts);
  } catch (error) {
    console.error('Error initializing test data:', error);
  }
}

// Run the initialization
initTestData().then(() => {
  console.log('Initialization complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Initialization failed:', error);
  process.exit(1);
}); 