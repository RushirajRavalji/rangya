import Link from 'next/link';
import OptimizedImage from '../common/OptimizedImage';

const categories = [
  {
    id: 'jeans',
    name: 'Jeans',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800',
    description: 'Premium denim jeans in various styles and fits'
  },
  {
    id: 'shirts',
    name: 'Shirts',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800',
    description: 'Casual and formal denim shirts for all occasions'
  },
  {
    id: 't-shirts',
    name: 'T-shirts',
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800',
    description: 'Stylish denim t-shirts to complete your look'
  },
  {
    id: 'accessories',
    name: 'Accessories',
    image: 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800',
    description: 'Coming soon'
  }
];

export default function FeaturedCategories() {
  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
        <p className="mt-2 text-gray-600">Explore our collection across different categories</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link 
            href={`/products?category=${encodeURIComponent(category.id)}`}
            key={category.id}
            className="group block overflow-hidden rounded-lg bg-gray-100 hover:shadow-lg transition-shadow"
          >
            <div className="relative aspect-square overflow-hidden">
              <OptimizedImage
                src={category.image}
                alt={category.name}
                width={400}
                height={400}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-xl font-bold text-white">{category.name}</h3>
                <p className="text-sm text-white/80 mt-1">{category.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
} 