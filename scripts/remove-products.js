const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function removeAllProducts() {
  try {
    console.log('Removing all products from the database...');
    
    // Get all products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    
    if (productsSnapshot.empty) {
      console.log('No products found in the database.');
      return;
    }
    
    const totalProducts = productsSnapshot.size;
    console.log(`Found ${totalProducts} products. Deleting...`);
    
    // Delete each product
    let deletedCount = 0;
    for (const productDoc of productsSnapshot.docs) {
      await deleteDoc(doc(db, 'products', productDoc.id));
      deletedCount++;
      console.log(`Deleted product ${deletedCount}/${totalProducts}: ${productDoc.data().name_en || 'Unnamed product'} (${productDoc.id})`);
    }
    
    console.log(`✅ Successfully removed ${deletedCount} products from the database.`);
  } catch (error) {
    console.error('Error removing products:', error);
  }
}

// Run the function
removeAllProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  }); 