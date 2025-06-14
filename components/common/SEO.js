import Head from 'next/head';
import React from 'react';

const SEO = ({
  title,
  description,
  canonical,
  openGraph,
  structuredData,
  twitter = {
    cardType: 'summary_large_image',
    handle: '@rangadenim'
  }
}) => {
  // Default values
  const defaultTitle = 'Ranga – Style Me Apna Rang | Premium Denim Clothing';
  const defaultDescription = 'Premium denim clothing for men. Style me apna rang - express your unique style with our quality denim products.';
  const defaultOG = {
    title: defaultTitle,
    description: defaultDescription,
    url: 'https://ranga-denim.com',
    type: 'website',
    siteName: 'Ranga – Style Me Apna Rang',
    images: [
      {
        url: 'https://ranga-denim.com/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Ranga – Style Me Apna Rang'
      }
    ]
  };

  // Merge with defaults
  const seoTitle = title ? `${title} | Ranga` : defaultTitle;
  const seoDescription = description || defaultDescription;
  const mergedOG = { ...defaultOG, ...openGraph };

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={mergedOG.title} />
      <meta property="og:description" content={mergedOG.description} />
      <meta property="og:url" content={mergedOG.url} />
      <meta property="og:type" content={mergedOG.type} />
      <meta property="og:site_name" content={mergedOG.siteName} />
      {mergedOG.images && mergedOG.images.map((image, index) => (
        <React.Fragment key={index}>
          <meta property="og:image" content={image.url} />
          {image.width && <meta property="og:image:width" content={image.width.toString()} />}
          {image.height && <meta property="og:image:height" content={image.height.toString()} />}
          {image.alt && <meta property="og:image:alt" content={image.alt} />}
        </React.Fragment>
      ))}

      {/* Twitter */}
      <meta name="twitter:card" content={twitter.cardType} />
      <meta name="twitter:site" content={twitter.handle} />
      <meta name="twitter:title" content={mergedOG.title} />
      <meta name="twitter:description" content={mergedOG.description} />
      {mergedOG.images && mergedOG.images[0] && (
        <meta name="twitter:image" content={mergedOG.images[0].url} />
      )}

      {/* Structured Data / JSON-LD */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
};

// Helper function to generate product structured data
export const generateProductStructuredData = (product) => {
  if (!product) return null;

  const productData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name_en,
    description: product.description_en,
    sku: product.id,
    mpn: product.id,
    image: product.images && product.images.length > 0 ? product.images : [],
    brand: {
      '@type': 'Brand',
      name: 'Ranga'
    },
    offers: {
      '@type': 'Offer',
      url: `https://ranga-denim.com/products/${product.slug}`,
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
      item: item.url
    }))
  };
};

// Helper function to generate organization structured data
export const generateOrganizationStructuredData = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ranga – Style Me Apna Rang',
    url: 'https://ranga-denim.com',
    logo: 'https://ranga-denim.com/images/logo.png',
    sameAs: [
      'https://www.facebook.com/rangadenim',
      'https://www.instagram.com/rangadenim',
      'https://twitter.com/rangadenim'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-9876543210',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi']
    }
  };
};

export default SEO; 