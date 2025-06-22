import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiPause, FiPlay, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const slides = [
  {
    id: 1,
    title: 'Premium Denim. Every Style. Your Rang.',
    description: 'Discover our collection of premium denim wear crafted for comfort and style.',
    image: '/images/carousel/jeans1.jpg',
    bgColor: 'bg-indigo-900',
    textColor: 'text-white',
  },
  {
    id: 2,
    title: 'Complete Denim Wardrobe—Shirts to Pants',
    description: 'One-stop destination for all your denim needs.',
    image: '/images/carousel/jeans2.jpg',
    bgColor: 'bg-blue-800',
    textColor: 'text-white',
  },
  {
    id: 3,
    title: '2 Denim Shirts + 1 Pant at ₹3999',
    description: 'Limited time offer! Build your perfect denim outfit today.',
    image: '/images/carousel/jeans3.jpg',
    bgColor: 'bg-orange-600',
    textColor: 'text-white',
  },
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef(null);
  
  const startAutoPlay = () => {
    intervalRef.current = setInterval(() => {
      goToNextSlide();
    }, 5000);
  };

  const stopAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const goToNextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goToPrevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goToSlide = (index) => {
    if (isTransitioning || index === currentSlide) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      startAutoPlay();
    }

    return () => stopAutoPlay();
  }, [isPlaying]);

  // Set initial random slide on mount
  useEffect(() => {
    // Choose a random slide on initial load
    const randomIndex = Math.floor(Math.random() * slides.length);
    setCurrentSlide(randomIndex);
  }, []);

  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          } ${slide.bgColor}`}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${slide.image})`,
              opacity: 0.9,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          {/* Add a fallback in case background image fails */}
          <img 
            src={slide.image} 
            alt="" 
            className="hidden"
            onError={(e) => {
              console.error(`Failed to load image: ${slide.image}`);
            }} 
          />
          <div className="container mx-auto px-4 z-10 text-center">
            <h2 className={`text-4xl md:text-6xl font-bold mb-4 ${slide.textColor} drop-shadow-lg`}>
              {slide.title}
            </h2>
            <p className={`text-lg md:text-xl mb-8 max-w-2xl mx-auto ${slide.textColor} drop-shadow-md`}>
              {slide.description}
            </p>
            <Link 
              href="/products" 
              className="bg-white text-indigo-deep hover:bg-gray-100 px-8 py-3 rounded-md font-medium text-lg transition-colors duration-200"
            >
              Shop Now
            </Link>
          </div>
        </div>
      ))}

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-center space-x-8">
        <button
          onClick={goToPrevSlide}
          className="bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors duration-200"
          aria-label="Previous slide"
        >
          <FiChevronLeft size={24} />
        </button>

        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-3 w-3 rounded-full transition-colors duration-200 ${
                index === currentSlide ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goToNextSlide}
          className="bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors duration-200"
          aria-label="Next slide"
        >
          <FiChevronRight size={24} />
        </button>

        <button
          onClick={togglePlayPause}
          className="bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors duration-200"
          aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
        >
          {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
        </button>
      </div>
    </div>
  );
};

export default HeroSection; 