// Direct script to add test products to Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_spb43jww6Pl9OFpIOMzg2LFrH-VbasQ",
  authDomain: "nikhils-jeans-website.firebaseapp.com",
  projectId: "nikhils-jeans-website",
  storageBucket: "nikhils-jeans-website.firebasestorage.app",
  messagingSenderId: "89588207516",
  appId: "1:89588207516:web:0cfbe407bb6d7cc8764259",
  measurementId: "G-ZHMF1GS857"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample product data
const testProducts = [
  {
    name_en: 'Classic Denim Shirt',
    slug: 'classic-denim-shirt',
    description_en: 'Premium quality denim shirt with classic styling.',
    price: 2499,
    salePrice: 1999,
    category: 'shirts',
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
    createdAt: serverTimestamp()
  },
  {
    name_en: 'Slim Fit Denim T-Shirt',
    slug: 'slim-fit-denim-tshirt',
    description_en: 'Comfortable slim fit denim t-shirt for casual wear.',
    price: 1499,
    salePrice: 1299,
    category: 'tshirts',
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
    createdAt: serverTimestamp()
  },
  {
    name_en: 'Relaxed Fit Denim Pants',
    slug: 'relaxed-fit-denim-pants',
    description_en: 'Comfortable relaxed fit denim pants for everyday wear.',
    price: 2999,
    salePrice: 2499,
    category: 'pants',
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
    createdAt: serverTimestamp()
  }
];

// Function to add products to Firestore
async function addTestProducts() {
  try {
    console.log('Starting to add test products...');
    const productsRef = collection(db, 'products');
    
    for (const product of testProducts) {
      console.log(`Adding product: ${product.name_en}`);
      const docRef = await addDoc(productsRef, product);
      console.log(`Added product with ID: ${docRef.id}`);
    }
    
    console.log('All test products added successfully!');
  } catch (error) {
    console.error('Error adding test products:', error);
  }
}

// Run the function
addTestProducts()
  .then(() => console.log('Script completed'))
  .catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  }); 