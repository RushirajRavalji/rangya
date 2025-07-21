import { useState } from 'react';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import OptimizedImage from '../common/OptimizedImage';

export default function HeroSection() {
  return (
    <div className="relative bg-gray-100">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Premium Denim <br />
              <span className="text-indigo-deep">For Every Style</span>
            </h1>
            <p className="text-lg text-gray-700 mb-6">
              Discover our collection of high-quality denim products crafted for comfort and durability.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/products" 
                className="bg-indigo-deep text-white px-6 py-3 rounded-md hover:bg-blue-800 transition-colors duration-200 inline-flex items-center"
              >
                Shop Now <FiArrowRight className="ml-2" />
              </Link>
              <Link 
                href="/about" 
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-100 transition-colors duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 relative">
            <div className="rounded-lg overflow-hidden shadow-xl">
              <OptimizedImage
                src="/images/carousel/denim-jacket.jpg"
                alt="Premium Denim Collection"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-lg shadow-lg hidden md:block">
              <p className="text-sm font-bold text-indigo-deep">New Collection</p>
              <p className="text-xs text-gray-600">Limited Edition</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 