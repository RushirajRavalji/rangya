/**
 * Utility functions for handling images, especially base64 encoded images
 */

/**
 * Converts a File object to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Compresses and converts an image file to base64 string
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<string>} - Base64 string
 */
export const compressAndConvertToBase64 = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions if needed
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        // Set canvas dimensions and draw image
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        const base64String = canvas.toDataURL('image/jpeg', quality);
        resolve(base64String);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

/**
 * Gets image dimensions from a URL or base64 string
 * @param {string} src - The image URL or base64 string
 * @returns {Promise<{width: number, height: number}>} - The image dimensions
 */
export const getImageDimensions = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Validates an image file
 * @param {File} file - The image file to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSizeMB - Maximum file size in MB
 * @param {string[]} options.allowedTypes - Allowed MIME types
 * @returns {boolean|string} - true if valid, error message if invalid
 */
export const validateImage = (file, options = { maxSizeMB: 5, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] }) => {
  if (!file) {
    return 'No file provided';
  }
  
  if (!options.allowedTypes.includes(file.type)) {
    return `File type not supported. Please upload ${options.allowedTypes.join(', ')}`;
  }
  
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > options.maxSizeMB) {
    return `File size exceeds ${options.maxSizeMB}MB limit`;
  }
  
  return true;
};

/**
 * Estimates the file size of a base64 string in bytes
 * @param {string} base64String - The base64 string
 * @returns {number} - Estimated file size in bytes
 */
export const estimateBase64Size = (base64String) => {
  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64WithoutPrefix = base64String.substring(base64String.indexOf(',') + 1);
  
  // Calculate the size: each Base64 digit represents 6 bits, so 4 digits = 3 bytes
  const padding = base64WithoutPrefix.endsWith('==') ? 2 : base64WithoutPrefix.endsWith('=') ? 1 : 0;
  return Math.floor((base64WithoutPrefix.length * 0.75) - padding);
};

/**
 * Checks if a string is a base64 image
 * @param {string} str - String to check
 * @returns {boolean} - True if the string is a base64 image
 */
export const isBase64Image = (str) => {
  if (!str) return false;
  return str.startsWith('data:image') || str.startsWith('data:application/octet-stream');
}; 