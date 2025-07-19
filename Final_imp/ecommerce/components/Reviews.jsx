import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../context/StateContext';
import { api } from '../lib/client';
import toast from 'react-hot-toast';

const Reviews = ({ productId }) => {
  const router = useRouter();
  const { user, isAuthenticated, showAddReview, setShowAddReview, voiceReviewData, setVoiceReviewData } = useStateContext();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    reviewText: '',
    recommended: true
  });  useEffect(() => {
    console.log('Reviews component - Authentication state changed:');
    console.log('- isAuthenticated:', isAuthenticated);
    console.log('- user:', user);
    console.log('- productId:', productId);
    
    if (productId) {
      fetchReviews();
    }
  }, [productId, isAuthenticated, user]);

  // Effect to handle voice review data changes
  useEffect(() => {
    if (voiceReviewData) {
      console.log('Voice review data updated:', voiceReviewData);
      
      // Set the form data based on voice input
      setNewReview(prev => ({
        ...prev,
        rating: voiceReviewData.rating || prev.rating,
        title: voiceReviewData.title || prev.title,
        reviewText: voiceReviewData.reviewText || prev.reviewText,
        recommended: voiceReviewData.recommended !== undefined ? voiceReviewData.recommended : prev.recommended
      }));
      
      // If submit flag is set, trigger form submission
      if (voiceReviewData.submit) {
        console.log('Voice commanded to submit review');
        
        // Create a synthetic event to pass to handleSubmitReview
        const syntheticEvent = {
          preventDefault: () => console.log('Preventing default form submission')
        };
        
        // Submit the review
        handleSubmitReview(syntheticEvent);
        
        // Reset the voice review data
        setVoiceReviewData(null);
      }
    }
  }, [voiceReviewData]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.reviews.getByProduct(productId);
      // Handle paginated response from backend
      const reviewsData = response.data?.content || response.data || [];
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    console.log('=== REVIEW SUBMISSION DEBUG START ===');
    console.log('User authenticated:', isAuthenticated);
    console.log('User object:', user);
    console.log('Product ID:', productId);
    console.log('Form data:', newReview);
      if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      return;
    }

    try {
      // Validate required fields first
      if (!newReview.title.trim() || newReview.title.trim().length < 3) {
        toast.error('Please enter a review title (at least 3 characters).');
        return;
      }
      
      if (!newReview.reviewText.trim() || newReview.reviewText.trim().length < 10) {
        toast.error('Please write a review of at least 10 characters.');
        return;
      }const reviewData = {
        productId: parseInt(productId),
        title: newReview.title.trim(),
        reviewText: newReview.reviewText.trim(),
        rating: parseInt(newReview.rating),
        recommended: newReview.recommended
      };

      const response = await api.reviews.create(reviewData);
        // Reset form and refresh reviews
      setNewReview({ rating: 5, title: '', reviewText: '', recommended: true });
      setShowAddReview(false);
      // Clear any voice review data
      if (voiceReviewData) {
        setVoiceReviewData(null);
      }      await fetchReviews();
      toast.success('Review submitted successfully!');
    } catch (error) {
      console.error('Review submission error:', error);
      
      let errorMessage = 'Error submitting review. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Your session may have expired. You will be redirected to login.';
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else if (error.response?.status === 400) {
        const validationErrors = error.response?.data?.errors || error.response?.data?.details || error.response?.data?.message;
        if (validationErrors) {
          errorMessage = `Validation error: ${typeof validationErrors === 'string' ? validationErrors : JSON.stringify(validationErrors)}`;
        } else {
          errorMessage = 'Please check your review data and try again.';
        }
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to submit reviews.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.floor(rating);
      const halfFilled = i === Math.floor(rating) && (rating % 1) >= 0.5;
      
      return (
        <span 
          key={i} 
          className={`star ${filled ? 'filled' : halfFilled ? 'half-filled' : ''}`}
        >
          ★
        </span>
      );
    });
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 0;

  if (loading) {
    return <div className="reviews-loading">Loading reviews...</div>;
  }

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <h3>Customer Reviews</h3>        {reviews.length > 0 && (
          <div className="rating-summary">
            <div className="average-rating">
              {renderStars(parseFloat(averageRating))}
              <span className="rating-number">{averageRating}/5</span>
              <span className="review-count">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className="add-review-section">
          {!showAddReview ? (
            <button 
              className="btn-primary"
              onClick={() => setShowAddReview(true)}
            >
              Write a Review
            </button>          ) : (
            <form onSubmit={handleSubmitReview} className="review-form">
              <h4>Add Your Review</h4>              {voiceReviewData && (
                <div className="voice-review-status">
                  <p>Voice control active! Say:</p>
                  {!voiceReviewData.rating && <p>"1-5" for rating</p>}
                  {voiceReviewData.rating && !voiceReviewData.title && <p>"title [your title]" for title</p>}
                  {voiceReviewData.title && !voiceReviewData.reviewText && <p>"comment [your review]" for review text</p>}
                  {voiceReviewData.reviewText && voiceReviewData.recommended === undefined && <p>"recommend" or "don't recommend"</p>}
                  {voiceReviewData.reviewText && voiceReviewData.recommended !== undefined && <p>"submit" to save or "cancel" to discard</p>}
                  
                  <div className="voice-review-progress">
                    <div className={`progress-step ${!voiceReviewData.rating ? 'active' : 'complete'}`}>1</div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${voiceReviewData.rating && !voiceReviewData.title ? 'active' : (voiceReviewData.title ? 'complete' : '')}`}>2</div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${voiceReviewData.title && !voiceReviewData.reviewText ? 'active' : (voiceReviewData.reviewText ? 'complete' : '')}`}>3</div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${voiceReviewData.reviewText && voiceReviewData.recommended === undefined ? 'active' : (voiceReviewData.recommended !== undefined ? 'complete' : '')}`}>4</div>
                  </div>
                </div>
              )}<div className="rating-input">
                <label>Rating:</label>
                <div className={`star-rating-input ${voiceReviewData && !voiceReviewData.title ? 'voice-active' : ''}`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`star-btn ${i < newReview.rating ? 'active' : ''}`}
                      onClick={() => setNewReview(prev => ({ ...prev, rating: i + 1 }))}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>              <div className="title-input">
                <label>Review Title:</label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your review a title..."
                  required
                  minLength="3"
                  className={voiceReviewData && voiceReviewData.title && !voiceReviewData.reviewText ? 'voice-active' : ''}
                />
              </div>              <div className="comment-input">
                <label>Review Text:</label>
                <textarea
                  value={newReview.reviewText}
                  onChange={(e) => setNewReview(prev => ({ ...prev, reviewText: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  rows="4"
                  required
                  minLength="10"
                  className={voiceReviewData && voiceReviewData.reviewText && voiceReviewData.recommended === undefined ? 'voice-active' : ''}
                />
              </div>

              <div className="recommendation-input">
                <label className={voiceReviewData && voiceReviewData.reviewText && voiceReviewData.recommended !== undefined ? 'voice-active' : ''}>
                  <input
                    type="checkbox"
                    checked={newReview.recommended}
                    onChange={(e) => setNewReview(prev => ({ ...prev, recommended: e.target.checked }))}
                  />
                  I would recommend this product to others
                </label>
              </div>              <div className="review-form-actions">                <button 
                  type="button"
                  className={voiceReviewData && voiceReviewData.reviewText && voiceReviewData.recommended !== undefined ? 'voice-action-btn' : ''}
                  onClick={() => {
                    setShowAddReview(false);
                    setNewReview({ rating: 5, title: '', reviewText: '', recommended: true });
                    // Clear any voice review data
                    if (voiceReviewData) {
                      setVoiceReviewData(null);
                    }
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn-primary ${voiceReviewData && voiceReviewData.reviewText && voiceReviewData.recommended !== undefined ? 'voice-action-btn' : ''}`}
                >
                  Submit Review
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="reviews-list">
        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.reviewId} className="review-item">              <div className="review-header">
                <div className="reviewer-info">
                  <span className="reviewer-name">
                    {review.customerName || 'Anonymous'}
                  </span>
                  <span className="review-date">{formatDate(review.reviewDate)}</span>
                </div>
                <div className="review-rating">
                  {renderStars(review.rating)}
                </div>
              </div>
              <div className="review-comment">
                {review.reviewText}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add styles for voice review status indicator */}
      <style jsx>{`
        .voice-review-status {
          background-color: #f8f0ff;
          border-left: 4px solid #8a2be2;
          padding: 10px 15px;
          margin-bottom: 20px;
          border-radius: 4px;
          animation: pulse 2s infinite;
        }
        
        .voice-review-status p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .voice-review-status p:first-child {
          font-weight: bold;
          color: #8a2be2;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(138, 43, 226, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(138, 43, 226, 0); }
          100% { box-shadow: 0 0 0 0 rgba(138, 43, 226, 0); }
        }

        .voice-active {
          border: 2px solid #8a2be2 !important;
          box-shadow: 0 0 8px rgba(138, 43, 226, 0.5);
          transition: all 0.3s ease;
        }
        
        input.voice-active, textarea.voice-active {
          background-color: #f8f0ff;
        }
        
        label.voice-active {
          color: #8a2be2;
          font-weight: bold;
        }
        
        .star-rating-input.voice-active {
          padding: 5px;
          border-radius: 4px;
          background-color: #f8f0ff;
        }

        .voice-action-btn {
          animation: pulse-button 1.5s infinite;
        }
        
        @keyframes pulse-button {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .voice-review-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 15px;
        }
        
        .progress-step {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background-color: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: #666;
        }
        
        .progress-step.active {
          background-color: #8a2be2;
          color: white;
          animation: pulse-step 1.5s infinite;
        }
        
        .progress-step.complete {
          background-color: #4CAF50;
          color: white;
        }
        
        .progress-line {
          height: 3px;
          width: 30px;
          background-color: #e0e0e0;
        }
        
        @keyframes pulse-step {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(138, 43, 226, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(138, 43, 226, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(138, 43, 226, 0); }
        }

        .voice-hint {
          background-color: #e8f4ff;
          border-left: 4px solid #2196F3;
          padding: 10px 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .voice-hint p {
          margin: 5px 0;
          font-size: 14px;
          color: #0d47a1;
        }
      `}</style>
    </div>
  );
};

export default Reviews;
