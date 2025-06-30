import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { db } from '../../utils/firebase';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

const Carousel = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // Check if string is a Base64 image
  const isBase64Image = (str) => {
    return typeof str === 'string' && str.startsWith('data:image/');
  };

  // Fetch carousel slides from database and set up a real-time listener
  useEffect(() => {
    setLoading(true);
    
    const slidesRef = collection(db, 'carouselSlides');
    const q = query(slidesRef, orderBy('order', 'asc'));
    
    console.log("Setting up carousel listener for collection 'carouselSlides'");
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const slidesData = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          
          // Log if we found Base64 images
          if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:image/')) {
            console.log(`Slide ${doc.id} contains Base64 image of length: ${data.imageUrl.length}`);
          }
          
          slidesData.push({
            id: doc.id,
            ...data
          });
        });

        console.log(`Received ${slidesData.length} carousel slides from Firestore`);
        
        if (slidesData.length > 0) {
          setSlides(slidesData);
        } else {
          console.log("No carousel slides found in database, using defaults");
          // Fallback default slides if none in database
          setSlides([
            {
              id: 'default-1',
              title: '2 Denim Shirts + 1 Pant at ₹3999',
              subtitle: 'Limited time offer! Build your perfect denim outfit today.',
              imageUrl: '/images/carousel/denim-jacket.jpg',
              ctaText: 'Shop Now',
              ctaLink: '/products',
              textColor: 'white'
            },
            {
              id: 'default-2',
              title: 'Summer Collection',
              subtitle: 'Explore our new summer styles with comfort and style.',
              imageUrl: '/images/carousel/jeans1.jpg',
              ctaText: 'View Collection',
              ctaLink: '/products',
              textColor: 'white'
            }
          ]);
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching carousel slides:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        // Set fallback slides on error
        setSlides([
          {
            id: 'default-1',
            title: '2 Denim Shirts + 1 Pant at ₹3999',
            subtitle: 'Limited time offer! Build your perfect denim outfit today.',
            imageUrl: '/images/carousel/denim-jacket.jpg',
            ctaText: 'Shop Now',
            ctaLink: '/products',
            textColor: 'white'
          }
        ]);
        setLoading(false);
      }
    );
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Reset current slide when slides change
  useEffect(() => {
    setCurrentSlide(0);
  }, [slides.length]);

  // Setup autoplay
  useEffect(() => {
    if (!autoplayEnabled || slides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds
    
    return () => clearInterval(interval);
  }, [autoplayEnabled, slides.length]);

  // Pause autoplay when user hovers over carousel
  const handleMouseEnter = () => setAutoplayEnabled(false);
  const handleMouseLeave = () => setAutoplayEnabled(true);

  // Navigation functions
  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };
  
  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-100 animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading carousel...</div>
      </div>
    );
  }

  if (slides.length === 0) {
    return null; // Don't render anything if no slides
  }

  return (
    <div 
      className="relative w-full overflow-hidden h-96 md:h-[500px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div 
            key={slide.id} 
            className="w-full h-full flex-shrink-0 relative"
          >
            {/* Background image - handle both Base64 and regular URLs */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.imageUrl})` }}
            >
              {/* Fallback for image loading errors */}
              <img
                src={slide.imageUrl}
                alt=""
                className="hidden"
                onError={(e) => {
                  console.error(`Error loading carousel image`);
                  e.target.parentElement.style.backgroundImage = `url(/images/carousel/denim-jacket.jpg)`;
                }}
              />
              {/* Overlay for better text visibility */}
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col justify-center items-center h-full text-center px-4 md:px-8 lg:px-16">
              <h2 
                className={`text-3xl md:text-5xl font-bold mb-2 md:mb-4 ${
                  slide.textColor === 'black' ? 'text-black' : 'text-white'
                }`}
              >
                {slide.title}
              </h2>
              
              {slide.subtitle && (
                <p 
                  className={`text-lg md:text-xl mb-6 md:mb-8 max-w-xl ${
                    slide.textColor === 'black' ? 'text-gray-800' : 'text-gray-100'
                  }`}
                >
                  {slide.subtitle}
                </p>
              )}
              
              {slide.ctaText && (
                <Link href={slide.ctaLink || '#'} className="bg-white text-gray-900 font-medium py-2 px-6 rounded-md hover:bg-gray-100 transition-colors">
                  {slide.ctaText}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={goToPrevSlide}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full text-gray-800 hover:bg-opacity-100 focus:outline-none z-10"
            aria-label="Previous slide"
          >
            <FiChevronLeft size={24} />
          </button>
          
          <button 
            onClick={goToNextSlide}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full text-gray-800 hover:bg-opacity-100 focus:outline-none z-10"
            aria-label="Next slide"
          >
            <FiChevronRight size={24} />
          </button>
          
          {/* Indicator dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentSlide === index
                    ? 'bg-white w-4'
                    : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Carousel; 