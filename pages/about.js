import { FiCheckCircle } from 'react-icons/fi';
import SEO from '../components/common/SEO';

export default function AboutUs() {
  // Define structured data for the About page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Ranga",
    "description": "Learn about Ranga - Premium denim clothing for men. Our story, values, and commitment to quality.",
    "publisher": {
      "@type": "Organization",
      "name": "Ranga – Style Me Apna Rang",
      "logo": {
        "@type": "ImageObject",
        "url": "https://ranga-denim.com/images/logo.png"
      }
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title="About Us | Ranga"
        description="Learn about Ranga - Premium denim clothing for men. Our story, values, and commitment to quality."
        canonical="https://ranga-denim.com/about"
        openGraph={{
          title: "About Ranga | Premium Denim Brand",
          description: "Learn about Ranga - Premium denim clothing for men. Our story, values, and commitment to quality.",
          url: "https://ranga-denim.com/about",
          type: "website"
        }}
        structuredData={structuredData}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">About Ranga</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-6">Our Story</h2>
            <p className="mb-6 text-gray-700">
              Founded in 2020, Ranga was born out of a passion for quality denim and a desire to create clothing that combines 
              traditional craftsmanship with modern design. Our name "Ranga" represents our commitment to helping you express 
              your unique style and personality through our carefully crafted denim products.
            </p>
            <p className="mb-6 text-gray-700">
              What started as a small workshop in Mumbai has grown into a beloved brand that serves denim enthusiasts across India. 
              Our dedication to quality materials, ethical manufacturing, and customer satisfaction has helped us build a loyal 
              community of customers who value both style and substance.
            </p>
            
            <div className="border-t border-gray-200 pt-6 mt-8">
              <h2 className="text-2xl font-semibold mb-6">Our Values</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiCheckCircle className="h-5 w-5 text-indigo-deep" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium">Quality First</h3>
                    <p className="mt-1 text-gray-700">
                      We use only the finest materials and employ skilled craftsmen to ensure every product meets our high standards.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiCheckCircle className="h-5 w-5 text-indigo-deep" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium">Sustainability</h3>
                    <p className="mt-1 text-gray-700">
                      We're committed to reducing our environmental impact through responsible sourcing, water conservation, and 
                      waste reduction in our manufacturing process.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiCheckCircle className="h-5 w-5 text-indigo-deep" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium">Fair Labor</h3>
                    <p className="mt-1 text-gray-700">
                      We ensure all workers in our supply chain are treated with dignity and respect, receiving fair wages and 
                      working in safe conditions.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <FiCheckCircle className="h-5 w-5 text-indigo-deep" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium">Innovation</h3>
                    <p className="mt-1 text-gray-700">
                      While respecting traditional craftsmanship, we continuously explore new techniques and designs to bring 
                      you the best in denim fashion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold mb-6">Our Promise</h2>
            <p className="text-gray-700">
              At Ranga, we promise to deliver products that not only look good but feel good and last long. We stand behind 
              everything we make, offering a satisfaction guarantee on all our products. Our customer service team is always 
              ready to assist you with any questions or concerns.
            </p>
            
            <div className="mt-8 text-center">
              <p className="text-lg font-medium text-indigo-deep">
                "Style Me Apna Rang" - Express your unique style with Ranga
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 