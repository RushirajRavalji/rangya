// Mock review service - no functionality
import { db } from './firebase';

/**
 * Mock function to get product reviews
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} - Empty array of reviews
 */
export const getProductReviews = async (productId) => {
  console.log('Mock getProductReviews called for product:', productId);
  return [];
};

/**
 * Mock function to get product rating
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - Default rating object
 */
export const getProductRating = async (productId) => {
  console.log('Mock getProductRating called for product:', productId);
  return {
    average: 0,
    count: 0,
    distribution: {}
  };
};

/**
 * Mock function to add product review
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} - Mock review object
 */
export const addProductReview = async (reviewData) => {
  console.log('Mock addProductReview called with data:', reviewData);
  return {
    id: 'mock-review-id',
    ...reviewData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
};

/**
 * Mock function to update product review
 * @param {string} reviewId - Review ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} - Mock review object
 */
export const updateProductReview = async (reviewId, reviewData) => {
  console.log('Mock updateProductReview called for review:', reviewId);
  return {
    id: reviewId,
    ...reviewData,
    status: 'pending',
    updatedAt: new Date().toISOString()
  };
};

/**
 * Mock function to delete product review
 * @param {string} reviewId - Review ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success flag
 */
export const deleteProductReview = async (reviewId, userId) => {
  console.log('Mock deleteProductReview called for review:', reviewId);
  return true;
};

/**
 * Mock function to get user's product review
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object|null>} - User's review or null
 */
export const getUserProductReview = async (userId, productId) => {
  console.log('Mock getUserProductReview called for user:', userId, 'and product:', productId);
  return null;
};

export default {
  getProductReviews,
  getProductRating,
  addProductReview,
  updateProductReview,
  deleteProductReview,
  getUserProductReview
}; 