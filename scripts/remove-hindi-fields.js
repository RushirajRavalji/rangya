const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function removeHindiFields() {
  try {
    console.log('Removing Hindi fields from all products...');
    
    // Get all products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    
    if (productsSnapshot.empty) {
      console.log('No products found in the database.');
      return;
    }
    
    const totalProducts = productsSnapshot.size;
    console.log(`Found ${totalProducts} products. Updating...`);
    
    // Update each product
    let updatedCount = 0;
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      const productRef = doc(db, 'products', productDoc.id);
      
      // Fields to remove
      const fieldsToRemove = {};
      
      // Check and mark fields for removal
      if ('name_hi' in productData) {
        fieldsToRemove.name_hi = null;
      }
      
      if ('description_hi' in productData) {
        fieldsToRemove.description_hi = null;
      }
      
      // Update the document if there are fields to remove
      if (Object.keys(fieldsToRemove).length > 0) {
        await updateDoc(productRef, fieldsToRemove);
        updatedCount++;
        console.log(`Updated product ${updatedCount}/${totalProducts}: ${productData.name_en || 'Unnamed product'} (${productDoc.id})`);
      }
    }
    
    console.log(`✅ Successfully removed Hindi fields from ${updatedCount} products.`);
  } catch (error) {
    console.error('Error removing Hindi fields:', error);
  }
}

// Run the function
removeHindiFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  }); 