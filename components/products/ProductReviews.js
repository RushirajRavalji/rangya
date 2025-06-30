import { useState, useEffect } from 'react';
import { FiStar, FiUser, FiThumbsUp, FiFlag, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  getProductReviews, 
  getProductRating, 
  addProductReview, 
  updateProductReview, 
  deleteProductReview,
  getUserProductReview
} from '../../utils/reviewService';
import Button from '../common/Button';
import { t } from '../../utils/i18n';

const ProductReviews = ({ productId, productName }) => {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState({ average: 0, count: 0, distribution: {} });
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });
  
  // Load reviews and ratings
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        
        // Get product rating
        const ratingData = await getProductRating(productId);
        setRating(ratingData);
        
        // Get reviews
        const reviewsData = await getProductReviews(productId);
        setReviews(reviewsData);
        
        // Check if user has already reviewed
        if (currentUser) {
          const userReviewData = await getUserProductReview(currentUser.uid, productId);
          setUserReview(userReviewData);
          
          if (userReviewData) {
            setReviewForm({
              rating: userReviewData.rating,
              title: userReviewData.title || '',
              comment: userReviewData.comment || ''
            });
          }
        }
      } catch (error) {
        console.error('Error loading reviews:', error);
        showNotification('Failed to load reviews', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadReviews();
  }, [productId, currentUser, showNotification]);
  
  // Handle review submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      showNotification('Please login to submit a review', 'info');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const reviewData = {
        productId,
        productName,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userEmail: currentUser.email,
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        comment: reviewForm.comment.trim()
      };
      
      let result;
      
      if (userReview) {
        // Update existing review
        result = await updateProductReview(userReview.id, reviewData);
        showNotification('Your review has been updated and is pending approval', 'success');
      } else {
        // Add new review
        result = await addProductReview(reviewData);
        showNotification('Your review has been submitted and is pending approval', 'success');
      }
      
      // Update user review state
      setUserReview(result);
      setShowReviewForm(false);
      
      // Refresh reviews
      const ratingData = await getProductRating(productId, true);
      setRating(ratingData);
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotification(error.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle review deletion
  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    try {
      setSubmitting(true);
      
      await deleteProductReview(userReview.id, currentUser.uid);
      
      showNotification('Your review has been deleted', 'success');
      
      // Reset state
      setUserReview(null);
      setReviewForm({
        rating: 5,
        title: '',
        comment: ''
      });
      
      // Refresh reviews
      const reviewsData = await getProductReviews(productId, { bypassCache: true });
      setReviews(reviewsData);
      
      const ratingData = await getProductRating(productId, true);
      setRating(ratingData);
    } catch (error) {
      console.error('Error deleting review:', error);
      showNotification(error.message || 'Failed to delete review', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`${
              star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            } w-5 h-5`}
          />
        ))}
      </div>
    );
  };
  
  // Render rating distribution
  const renderRatingDistribution = () => {
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = rating.distribution[star] || 0;
          const percentage = rating.count > 0 ? (count / rating.count) * 100 : 0;
          
          return (
            <div key={star} className="flex items-center text-sm">
              <span className="w-12">{star} stars</span>
              <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-12 text-right text-gray-500">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">{t('product.reviews')}</h2>
      
      {/* Overall rating */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="md:w-1/3 mb-4 md:mb-0">
            <div className="flex items-baseline">
              <span className="text-5xl font-bold">{rating.average}</span>
              <span className="text-xl text-gray-500 ml-2">/ 5</span>
            </div>
            <div className="flex items-center mt-2">
              {renderStars(rating.average)}
              <span className="ml-2 text-gray-500">({rating.count} {rating.count === 1 ? 'review' : 'reviews'})</span>
            </div>
          </div>
          
          <div className="md:w-2/3">
            {renderRatingDistribution()}
          </div>
        </div>
      </div>
      
      {/* Review form */}
      {currentUser && (
        <div className="mb-8">
          {!userReview || showReviewForm ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">
                {userReview ? 'Edit Your Review' : 'Write a Review'}
              </h3>
              
              <form onSubmit={handleSubmitReview}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Rating</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="focus:outline-none"
                        aria-label={`Rate ${star} stars`}
                      >
                        <FiStar
                          className={`w-8 h-8 ${
                            star <= reviewForm.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="review-title" className="block text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    id="review-title"
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Summarize your experience"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="review-comment" className="block text-gray-700 mb-2">
                    Review
                  </label>
                  <textarea
                    id="review-comment"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    rows="4"
                    placeholder="Share your experience with this product"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  {userReview && (
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewForm(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  )}
                  
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={submitting}
                  >
                    {userReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex justify-between items-center mb-6">
              <div>
                {userReview.approved ? (
                  <span className="text-green-600 font-medium">Your review is published</span>
                ) : (
                  <span className="text-amber-600 font-medium">Your review is pending approval</span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewForm(true)}
                  leftIcon={<FiEdit />}
                >
                  Edit
                </Button>
                
                <Button
                  variant="danger"
                  onClick={handleDeleteReview}
                  leftIcon={<FiTrash2 />}
                  isLoading={submitting}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Reviews list */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
            
            {!currentUser && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)}
              >
                Login to Write a Review
              </Button>
            )}
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between mb-2">
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-full p-2">
                    <FiUser className="text-gray-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">{review.userName}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(review.createdAt?.seconds ? review.createdAt.seconds * 1000 : review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {renderStars(review.rating)}
              </div>
              
              <h3 className="text-lg font-semibold mb-2">{review.title}</h3>
              <p className="text-gray-700 mb-4">{review.comment}</p>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center hover:text-gray-700">
                    <FiThumbsUp className="mr-1" />
                    <span>Helpful</span>
                  </button>
                  
                  <button className="flex items-center hover:text-gray-700">
                    <FiFlag className="mr-1" />
                    <span>Report</span>
                  </button>
                </div>
                
                {review.updatedAt && review.updatedAt !== review.createdAt && (
                  <span className="italic">Edited</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews; 