import { getProducts } from '../../utils/productService';
import rateLimit from '../../utils/rateLimit';

// Create a rate limiter that allows 5 requests per minute
// Sitemap is typically requested by crawlers, so we limit it more strictly
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 100, // Max 100 users per interval
  limit: 5, // 5 requests per interval per IP
});

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Apply rate limiting - but don't block if it fails
    try {
      await limiter.check(res, 5, 'SITEMAP_TOKEN');
    } catch (rateLimitError) {
      console.warn('Rate limit warning for sitemap:', rateLimitError.message);
      // Continue processing the request even if rate limiting fails
    }
    
    // Set the appropriate content type
    res.setHeader('Content-Type', 'application/xml');
    
    // Set cache control for better performance (cache for 24 hours)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    
    // Fetch all products with a reasonable limit
    const { products } = await getProducts({ limit: 1000 });
    
    // Generate the sitemap XML
    const sitemap = generateSitemap(products || []);
    
    // Send the sitemap
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Set content type to XML even for error response
    res.setHeader('Content-Type', 'application/xml');
    
    // Return a minimal valid XML in case of error
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ranga-denim.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  }
}

function generateSitemap(products) {
  const baseUrl = 'https://ranga-denim.com';
  
  // Get the current date for the lastmod field
  const date = new Date().toISOString().split('T')[0];
  
  // Start the XML string
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Add static pages
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: '1.0' },
    { url: '/products', changefreq: 'daily', priority: '0.9' },
    { url: '/about', changefreq: 'monthly', priority: '0.7' },
    { url: '/contact', changefreq: 'monthly', priority: '0.7' },
    { url: '/sale', changefreq: 'weekly', priority: '0.8' }
  ];
  
  staticPages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
    xml += `    <lastmod>${date}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  // Add category pages
  const categories = ['jeans', 'shirts', 'jackets', 'accessories'];
  categories.forEach(category => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/products?category=${encodeURIComponent(category)}</loc>\n`;
    xml += `    <lastmod>${date}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });
  
  // Add product pages (with XSS protection)
  if (products && Array.isArray(products)) {
    products.forEach(product => {
      if (product && product.slug) {
        // Sanitize the slug to prevent XSS in the sitemap
        const safeSlug = encodeURIComponent(product.slug)
          .replace(/[<>&'"]/g, ''); // Extra safety
        
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/products/${safeSlug}</loc>\n`;
        
        // Use the product's updatedAt date if available, otherwise use the current date
        const productDate = product.updatedAt ? 
          new Date(product.updatedAt.seconds * 1000).toISOString().split('T')[0] : 
          date;
        
        xml += `    <lastmod>${productDate}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    });
  }
  
  // Close the XML
  xml += '</urlset>';
  
  return xml;
} 