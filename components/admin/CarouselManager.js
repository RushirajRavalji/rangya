import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiTrash2, 
  FiMove, 
  FiEdit, 
  FiImage, 
  FiChevronUp, 
  FiChevronDown,
  FiSave
} from 'react-icons/fi';
import { db } from '../../utils/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore';

const CarouselManager = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingSlide, setEditingSlide] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [invalidFieldsError, setInvalidFieldsError] = useState(null);
  
  // Initial slide template
  const initialSlide = {
    title: '',
    subtitle: '',
    imageUrl: '',
    ctaText: 'Shop Now',
    ctaLink: '/products',
    textColor: 'white'
  };

  // Validate individual slide
  const validateSlide = (slide) => {
    const errors = [];
    if (!slide.title) errors.push('title');
    
    // Check for image - now handles both imageUrl string and imageFile with base64
    const hasImage = slide.imageUrl || (imageFile && editingSlide !== null);
    if (!hasImage) errors.push('image');
    
    return errors;
  };

  // Check if Base64 string exceeds Firestore document size limit
  const checkBase64Size = (base64String) => {
    // Estimate size in bytes (roughly 3/4 of length for base64)
    const estimatedSize = Math.ceil(base64String.length * 0.75);
    const maxSize = 1000000; // 1MB (Firestore has 1MB document size limit)
    
    if (estimatedSize > maxSize) {
      return {
        tooLarge: true,
        size: estimatedSize,
        readableSize: `${(estimatedSize / 1024 / 1024).toFixed(2)}MB`
      };
    }
    
    return {
      tooLarge: false,
      size: estimatedSize,
      readableSize: `${(estimatedSize / 1024).toFixed(2)}KB`
    };
  };

  // Fetch carousel slides from database
  const fetchSlides = async () => {
    try {
      console.log("Fetching carousel slides from Firestore...");
      setLoading(true);
      const slidesRef = collection(db, 'carouselSlides');
      const q = query(slidesRef, orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const slidesData = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        slidesData.push({
          id: doc.id,
          ...data
        });
        
        // Log if we have Base64 images
        if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:image/')) {
          console.log(`Slide ${doc.id} has Base64 image of length: ${data.imageUrl.length}`);
        }
      });
      
      console.log(`Fetched ${slidesData.length} slides from database`);
      
      // If no slides, initialize with one empty slide
      if (slidesData.length === 0) {
        console.log("No slides found, initializing with empty slide");
        setSlides([{ ...initialSlide, order: 0 }]);
      } else {
        setSlides(slidesData);
      }
    } catch (err) {
      setError('Failed to load carousel slides');
      console.error('Error fetching carousel slides:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch slides on component mount
  useEffect(() => {
    fetchSlides();
  }, []);

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      const maxSize = 2 * 1024 * 1024; // 2MB limit for base64 encoding
      
      console.log("Processing file:", file.name, "Size:", Math.round(file.size / 1024), "KB", "Type:", file.type);
      
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, WEBP)');
        return;
      }
      
      if (file.size > maxSize) {
        setError('Image size should be less than 2MB for Base64 encoding');
        return;
      }
      
      // Convert to Base64
      console.log("Converting image to Base64...");
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;
        console.log("Base64 conversion successful. String length:", base64String.length);
        setImagePreview(base64String);
        
        // Store both the file and the Base64 string
        setImageFile({
          file: file,
          base64: base64String
        });
      };
      reader.onerror = (error) => {
        console.error("Error converting image to Base64:", error);
        setError('Failed to process image. Please try another one.');
      };
      reader.readAsDataURL(file);
      setError(null); // Clear any previous errors
    }
  };

  // Handle adding a new slide
  const handleAddSlide = () => {
    // Add a new slide at the end
    setSlides(prev => [
      ...prev, 
      { 
        ...initialSlide, 
        order: prev.length 
      }
    ]);
    
    // Start editing the new slide
    setEditingSlide(slides.length);
  };

  // Handle removing a slide
  const handleRemoveSlide = async (index) => {
    try {
      const slideToRemove = slides[index];
      
      // If slide has an ID, delete from database
      if (slideToRemove.id) {
        // No need to delete from storage as we're using Base64
        // Delete the slide document
        await deleteDoc(doc(db, 'carouselSlides', slideToRemove.id));
      }
      
      // Remove from state
      setSlides(prev => prev.filter((_, i) => i !== index));
      
      // Clear editing state if removing the edited slide
      if (editingSlide === index) {
        setEditingSlide(null);
        setImageFile(null);
        setImagePreview(null);
      }
      
      // Show success message
      setSuccess('Slide removed successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError('Failed to remove slide');
      console.error('Error removing slide:', err);
    }
  };

  // Handle reordering slides 
  const reorderSlides = (slides) => {
    // Update order property for each slide
    return slides.map((item, index) => ({
      ...item,
      order: index
    }));
  };

  // Open edit mode for a slide
  const handleEditSlide = (index) => {
    setEditingSlide(index);
    setImagePreview(slides[index].imageUrl || null);
    setImageFile(null);
  };

  // Handle changes to slide title and other properties
  const handleSlideChange = (index, field, value) => {
    setSlides(prev => prev.map((slide, i) => 
      i === index ? { ...slide, [field]: value } : slide
    ));
  };

  // Handle moving slides up/down
  const moveSlide = (index, direction) => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === slides.length - 1)
    ) {
      return; // Can't move further up/down
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSlides = [...slides];
    
    // Swap slides
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    
    // Update order property
    const reorderedSlides = reorderSlides(newSlides);
    
    setSlides(reorderedSlides);
  };

  // Save all slides
  const saveAllSlides = async () => {
    try {
      setSaving(true);
      setError(null);
      console.log("Starting save operation for slides:", slides);
      
      // Validate slides data before saving
      const invalidSlides = slides.filter(slide => validateSlide(slide).length > 0);
      if (invalidSlides.length > 0) {
        setError('All slides must have at least a title and image');
        setSaving(false);
        return;
      }
      
      console.log("All slides validated successfully");
      
      // Create a working copy of slides to avoid race conditions
      let workingSlides = [...slides];
      
      // No need for special image upload handling since we're using Base64
      // Just update the imageUrl with the base64 string if we have a new image
      if (imageFile && editingSlide !== null) {
        console.log("Using Base64 encoded image for slide", editingSlide);
        console.log("Base64 image length:", imageFile.base64.length);
        
        // Check if Base64 string is too large for Firestore
        const sizeCheck = checkBase64Size(imageFile.base64);
        if (sizeCheck.tooLarge) {
          setError(`Image is too large (${sizeCheck.readableSize}) for Firestore. Please use a smaller image (under 1MB).`);
          setSaving(false);
          return;
        }
        
        console.log(`Estimated Base64 size: ${sizeCheck.readableSize}`);
        
        // Update the working copy of slides with the Base64 image
        workingSlides = workingSlides.map((s, idx) => 
          idx === editingSlide ? { ...s, imageUrl: imageFile.base64 } : s
        );
      }
      
      // Now update all slides in database using our working copy
      for (let i = 0; i < workingSlides.length; i++) {
        let slide = { ...workingSlides[i] };
        console.log("Processing slide:", i, "ID:", slide.id || "new");
        
        try {
          if (slide.id) {
            // Update existing slide
            console.log("Updating existing slide:", slide.id);
            await updateDoc(doc(db, 'carouselSlides', slide.id), {
              title: slide.title || '',
              subtitle: slide.subtitle || '',
              imageUrl: slide.imageUrl || '',
              ctaText: slide.ctaText || 'Shop Now',
              ctaLink: slide.ctaLink || '/products',
              textColor: slide.textColor || 'white',
              order: slide.order || i,
              updatedAt: new Date()
            });
            console.log("Slide updated successfully");
          } else {
            // Create new slide
            console.log("Creating new slide");
            const docRef = await addDoc(collection(db, 'carouselSlides'), {
              title: slide.title || '',
              subtitle: slide.subtitle || '',
              imageUrl: slide.imageUrl || '',
              ctaText: slide.ctaText || 'Shop Now',
              ctaLink: slide.ctaLink || '/products',
              textColor: slide.textColor || 'white',
              order: slide.order || i,
              createdAt: new Date()
            });
            
            console.log("New slide created with ID:", docRef.id);
            
            // Update our working copy with the new ID
            workingSlides[i] = { ...workingSlides[i], id: docRef.id };
          }
        } catch (dbError) {
          console.error("Error saving slide to database:", dbError);
          setError(`Failed to save slide: ${dbError.message}`);
          throw dbError;
        }
      }
      
      console.log("All slides saved to Firestore successfully");
      
      // Update the actual state with our working copy
      setSlides(workingSlides);
      
      // Reset editing state
      setEditingSlide(null);
      setImageFile(null);
      setImagePreview(null);
      
      // Show success message
      setSuccess('Carousel slides saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh slides from database to ensure we have the latest data
      await fetchSlides();
      
    } catch (err) {
      setError('Failed to save carousel slides');
      console.error('Error saving carousel slides:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="ml-3">Loading carousel slides...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold mb-6">Carousel Management</h2>
      
      {/* Success/Error Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
          <p>{success}</p>
        </div>
      )}
      
      {/* Slide editor */}
      {editingSlide !== null && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Edit Slide</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side - Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slide Image
              </label>
              
              <div className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Slide preview" 
                      className="w-full h-48 object-cover rounded"
                    />
                    <button 
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="h-48 flex flex-col items-center justify-center cursor-pointer"
                    onClick={() => document.getElementById('slide-image-upload').click()}
                  >
                    <FiImage size={48} className="text-gray-400 mb-2" />
                    <p className="text-gray-500">Click to upload image</p>
                    <p className="text-xs text-gray-400 mt-1">Recommended size: 1600x600px</p>
                  </div>
                )}
                
                <input
                  type="file"
                  id="slide-image-upload"
                  className="hidden"
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </div>
              
              <button
                onClick={() => document.getElementById('slide-image-upload').click()}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </button>
            </div>
            
            {/* Right side - Text content */}
            <div className="space-y-4">
              <div>
                <label htmlFor="slide-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="slide-title"
                  value={slides[editingSlide]?.title || ''}
                  onChange={(e) => handleSlideChange(editingSlide, 'title', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Slide title"
                />
              </div>
              
              <div>
                <label htmlFor="slide-subtitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle
                </label>
                <textarea
                  id="slide-subtitle"
                  value={slides[editingSlide]?.subtitle || ''}
                  onChange={(e) => handleSlideChange(editingSlide, 'subtitle', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Slide subtitle or description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="slide-cta-text" className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    id="slide-cta-text"
                    value={slides[editingSlide]?.ctaText || 'Shop Now'}
                    onChange={(e) => handleSlideChange(editingSlide, 'ctaText', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Call to action text"
                  />
                </div>
                
                <div>
                  <label htmlFor="slide-cta-link" className="block text-sm font-medium text-gray-700 mb-1">
                    Button Link
                  </label>
                  <input
                    type="text"
                    id="slide-cta-link"
                    value={slides[editingSlide]?.ctaLink || '/products'}
                    onChange={(e) => handleSlideChange(editingSlide, 'ctaLink', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="/products"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="slide-text-color" className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <select
                  id="slide-text-color"
                  value={slides[editingSlide]?.textColor || 'white'}
                  onChange={(e) => handleSlideChange(editingSlide, 'textColor', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                // Discard changes and reset state
                fetchSlides().then(() => {
                  setEditingSlide(null);
                  setImageFile(null);
                  setImagePreview(null);
                  setInvalidFieldsError(null);
                });
              }}
              className="mr-4 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (editingSlide !== null) {
                  const currentSlide = slides[editingSlide];
                  const errors = validateSlide(currentSlide);
                  if (errors.length > 0) {
                    setInvalidFieldsError(`Please fill in the following fields: ${errors.join(', ')}`);
                    return;
                  }
                  setInvalidFieldsError(null);
                }
                saveAllSlides();
              }}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          
          {invalidFieldsError && (
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
              <p>{invalidFieldsError}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Slides list */}
      <div className="space-y-4 mb-6">
        {slides.map((slide, index) => (
          <div
            key={slide.id || `new-slide-${index}`}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="flex items-center p-4">
              <div
                className="mr-4 p-2 rounded-md hover:bg-gray-100 cursor-move"
              >
                <FiMove className="text-gray-500" />
              </div>
              
              <div className="flex-grow">
                <h4 className="font-medium">
                  {slide.title || 'Untitled Slide'}
                </h4>
                <p className="text-sm text-gray-500 truncate">
                  {slide.subtitle || 'No description'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => moveSlide(index, 'up')}
                  disabled={index === 0}
                  className={`p-2 rounded-md ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <FiChevronUp />
                </button>
                
                <button
                  onClick={() => moveSlide(index, 'down')}
                  disabled={index === slides.length - 1}
                  className={`p-2 rounded-md ${index === slides.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <FiChevronDown />
                </button>
                
                <button
                  onClick={() => handleEditSlide(index)}
                  className="p-2 rounded-md hover:bg-gray-100 text-blue-500"
                >
                  <FiEdit />
                </button>
                
                <button
                  onClick={() => handleRemoveSlide(index)}
                  className="p-2 rounded-md hover:bg-gray-100 text-red-500"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
            
            {slide.imageUrl && (
              <div className="h-24 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={slide.imageUrl}
                  alt={slide.title || 'Carousel slide'}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Add slide button */}
      <div className="flex justify-between">
        <button
          onClick={handleAddSlide}
          className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          <FiPlus className="mr-2" /> Add New Slide
        </button>
        
        <button
          onClick={saveAllSlides}
          className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          disabled={saving || editingSlide !== null}
        >
          <FiSave className="mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};

export default CarouselManager; 