import { FiStar } from 'react-icons/fi';

const testimonials = [
  {
    id: 1,
    name: 'Rajesh Kumar',
    role: 'Fashion Enthusiast',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
    rating: 5,
    text: "The quality of Ranga denim is exceptional. I've been wearing their jeans for over a year now, and they've aged beautifully. The fit is perfect, and the attention to detail is impressive."
  },
  {
    id: 2,
    name: 'Priya Sharma',
    role: 'Style Blogger',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
    rating: 5,
    text: "As someone who reviews fashion brands professionally, I can say that Ranga stands out for their commitment to quality. Their denim shirts have become a staple in my wardrobe."
  },
  {
    id: 3,
    name: 'Arjun Patel',
    role: 'College Student',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
    rating: 4,
    text: "Affordable yet stylish - that's what I love about Ranga. As a student on a budget, I appreciate that I can get premium quality denim without breaking the bank."
  }
];

export default function Testimonials() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">What Our Customers Say</h2>
          <p className="mt-2 text-gray-600">Hear from people who love our products</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id}
              className="bg-white rounded-lg shadow-sm p-6 flex flex-col"
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{testimonial.name}</h3>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
              
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <FiStar 
                    key={i}
                    className={`${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} h-5 w-5`}
                  />
                ))}
              </div>
              
              <p className="text-gray-700 flex-grow">{testimonial.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 