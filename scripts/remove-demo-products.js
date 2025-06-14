// Script to remove demo products from Firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

// Demo product slugs to remove
const demoProductSlugs = [
  'classic-denim-shirt',
  'slim-fit-denim-tshirt',
  'relaxed-fit-denim-pants'
];

async function removeDemoProducts() {
  try {
    console.log('Starting to remove demo products...');
    const productsRef = collection(db, 'products');
    
    for (const slug of demoProductSlugs) {
      console.log(`Looking for product with slug: ${slug}`);
      
      // Query for products with this slug
      const q = query(productsRef, where('slug', '==', slug));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log(`No product found with slug: ${slug}`);
        continue;
      }
      
      // Delete each matching product
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        console.log(`Deleting product with ID: ${document.id}`);
        deletePromises.push(deleteDoc(doc(db, 'products', document.id)));
      });
      
      await Promise.all(deletePromises);
      console.log(`Successfully deleted products with slug: ${slug}`);
    }
    
    console.log('All demo products removed successfully!');
  } catch (error) {
    console.error('Error removing demo products:', error);
  }
}

// Run the function
removeDemoProducts()
  .then(() => console.log('Script completed'))
  .catch(error => {
    console.error('Script error:', error);
    process.exit(1);
  }); 