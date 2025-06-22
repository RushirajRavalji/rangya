import Head from 'next/head';
import React from 'react';

/**
 * SEO component for managing document head metadata
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {string} props.canonical - Canonical URL
 * @param {string} props.image - Open Graph image URL
 * @param {string} props.type - Open Graph type (website, article, product)
 * @param {Object} props.product - Product data for product pages
 * @param {Object} props.article - Article data for blog posts
 * @param {Array} props.keywords - SEO keywords
 * @param {boolean} props.noindex - Whether to prevent indexing
 * @param {Object} props.openGraph - Additional Open Graph properties
 * @param {Object} props.twitter - Additional Twitter card properties
 * @param {Array} props.additionalMetaTags - Additional meta tags
 * @param {Array} props.additionalLinkTags - Additional link tags
 * @returns {JSX.Element} SEO component
 */
const SEO = ({
  title = 'Rangya - Premium Denim Clothing',
  description = 'Discover premium denim clothing and accessories at Rangya. Shop our collection of high-quality jeans, jackets, shirts and more.',
  canonical,
  image = '/images/logo/logo.png',
  type = 'website',
  product = null,
  article = null,
  keywords = [],
  noindex = false,
  openGraph = {},
  twitter = {},
  additionalMetaTags = [],
  additionalLinkTags = []
}) => {
  // Base URL for canonical and OG URLs
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rangya.com';
  
  // Format canonical URL
  const canonicalUrl = canonical ? 
    (canonical.startsWith('http') ? canonical : `${baseUrl}${canonical}`) : 
    baseUrl;
  
  // Format image URL
  const imageUrl = image ? 
    (image.startsWith('http') ? image : `${baseUrl}${image}`) : 
    `${baseUrl}/images/logo/logo.png`;
  
  // Prepare structured data
  let structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Rangya',
    url: baseUrl,
    description: description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
  
  // Add product structured data if provided
  if (product && type === 'product') {
    structuredData = generateProductStructuredData(product);
  }
  
  // Add article structured data if provided
  if (article && type === 'article') {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      image: article.image ? 
        (article.image.startsWith('http') ? article.image : `${baseUrl}${article.image}`) : 
        imageUrl,
      datePublished: article.publishDate,
      dateModified: article.modifiedDate || article.publishDate,
      author: {
        '@type': 'Person',
        name: article.author || 'Rangya Team'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Rangya',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/images/logo/logo.png`
        }
      },
      description: article.description || description
    };
  }

  // Prepare organization structured data
  const organizationStructuredData = generateOrganizationStructuredData();
  
  // Prepare Open Graph data
  const openGraphData = {
    title: openGraph.title || title,
    description: openGraph.description || description,
    type: openGraph.type || type,
    url: openGraph.url || canonicalUrl,
    images: openGraph.images || [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: title
      }
    ],
    site_name: 'Rangya',
    ...openGraph
  };
  
  // Prepare Twitter card data
  const twitterData = {
    card: twitter.card || 'summary_large_image',
    title: twitter.title || title,
    description: twitter.description || description,
    image: twitter.image || imageUrl,
    ...twitter
  };
  
  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots Meta Tags */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={openGraphData.title} />
      <meta property="og:description" content={openGraphData.description} />
      <meta property="og:type" content={openGraphData.type} />
      <meta property="og:url" content={openGraphData.url} />
      <meta property="og:image" content={openGraphData.images[0].url} />
      <meta property="og:image:width" content={openGraphData.images[0].width || 1200} />
      <meta property="og:image:height" content={openGraphData.images[0].height || 630} />
      <meta property="og:image:alt" content={openGraphData.images[0].alt || title} />
      <meta property="og:site_name" content={openGraphData.site_name} />
      
      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content={twitterData.card} />
      <meta name="twitter:title" content={twitterData.title} />
      <meta name="twitter:description" content={twitterData.description} />
      <meta name="twitter:image" content={twitterData.image} />
      
      {/* Structured Data */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* Organization Structured Data */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
      />
      
      {/* Additional Meta Tags */}
      {additionalMetaTags.map((tag, index) => (
        <meta key={`meta-${index}`} {...tag} />
      ))}
      
      {/* Additional Link Tags */}
      {additionalLinkTags.map((tag, index) => (
        <link key={`link-${index}`} {...tag} />
      ))}
    </Head>
  );
};

// Helper function to generate product structured data
export const generateProductStructuredData = (product) => {
  if (!product) return null;

  const productData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name_en || product.name,
    description: product.description_en || product.description,
    sku: product.sku || product.id,
    mpn: product.mpn || product.id,
    image: product.images && product.images.length > 0 ? product.images : [],
    brand: {
      '@type': 'Brand',
      name: 'Rangya'
    },
    offers: {
      '@type': 'Offer',
      url: product.url || `https://rangya.com/products/${product.slug}`,
      priceCurrency: 'INR',
      price: product.salePrice || product.price,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.stock && Object.values(product.stock).some(qty => qty > 0) 
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock'
    }
  };

  // Add reviews if available
  if (product.reviews && product.reviews.length > 0) {
    const avgRating = product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length;
    
    productData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount: product.reviews.length
    };
    
    productData.review = product.reviews.map(review => ({
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating
      },
      author: {
        '@type': 'Person',
        name: review.author
      },
      reviewBody: review.text
    }));
  }

  return productData;
};

// Helper function to generate breadcrumb structured data
export const generateBreadcrumbStructuredData = (items) => {
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `https://rangya.com${item.url}`
    }))
  };
};

// Helper function to generate organization structured data
export const generateOrganizationStructuredData = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Rangya – Style Me Apna Rang',
    url: 'https://rangya.com',
    logo: 'https://rangya.com/images/logo/logo.png',
    sameAs: [
      'https://www.facebook.com/rangya',
      'https://www.instagram.com/rangya',
      'https://twitter.com/rangya'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-9876543210',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi']
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Shop No. 123, Main Street',
      addressLocality: 'New Delhi',
      postalCode: '110001',
      addressCountry: 'IN'
    }
  };
};

// Helper function to generate FAQ structured data
export const generateFAQStructuredData = (questions) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer
      }
    }))
  };
};

export default SEO; 