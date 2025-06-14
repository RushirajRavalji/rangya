require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const PRODUCT_JSON_PATH = process.env.PRODUCT_JSON_PATH || '../local-data/product-data.json';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '../local-data/products';

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Initialize an empty product data file if it doesn't exist
if (!fs.existsSync(PRODUCT_JSON_PATH)) {
  fs.writeFileSync(PRODUCT_JSON_PATH, JSON.stringify([], null, 2));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('Ranga E-commerce API is running');
});

// Get all products
app.get('/products', (req, res) => {
  try {
    const data = fs.readFileSync(PRODUCT_JSON_PATH, 'utf8');
    const products = JSON.parse(data);
    res.json(products);
  } catch (error) {
    console.error('Error reading product data:', error);
    res.status(500).json({ error: 'Failed to read product data' });
  }
});

// Upload product with images
app.post('/upload', upload.array('images', 5), (req, res) => {
  try {
    const productData = req.body;
    const files = req.files;
    
    // Read existing products
    const data = fs.readFileSync(PRODUCT_JSON_PATH, 'utf8');
    const products = JSON.parse(data);
    
    // Add image paths to product data
    productData.images = files.map(file => `/products/${file.filename}`);
    
    // Add the new product
    products.push(productData);
    
    // Write back to the JSON file
    fs.writeFileSync(PRODUCT_JSON_PATH, JSON.stringify(products, null, 2));
    
    res.status(201).json({ message: 'Product added successfully', product: productData });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 