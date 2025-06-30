import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

/**
 * Generate organization structured data for SEO
 * @returns {Object} Organization schema object
 */
export const generateOrganizationStructuredData = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rangya.com';
  const siteName = 'Rangya';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/images/logo/logo.png`,
    sameAs: [
      'https://facebook.com/rangya',
      'https://instagram.com/rangya',
      'https://twitter.com/rangya'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-123-456-7890',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi']
    }
  };
};

/**
 * SEO component for improved search engine optimization
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {string} props.canonical - Canonical URL
 * @param {string} props.ogImage - Open Graph image URL
 * @param {string} props.ogType - Open Graph type
 * @param {Array} props.keywords - Keywords for meta tags
 * @param {Object} props.product - Product data for product schema
 * @param {Array} props.breadcrumbs - Breadcrumb data for breadcrumb schema
 * @param {boolean} props.noindex - Whether to add noindex meta tag
 */
const SEO = ({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  keywords,
  product,
  breadcrumbs,
  noindex = false
}) => {
  const router = useRouter();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rangya.com';
  const siteName = 'Rangya';
  
  // Default meta values
  const defaultTitle = 'Rangya - Premium Denim & Clothing';
  const defaultDescription = 'Discover premium quality denim and clothing at Rangya. Shop our collection of sustainable, ethically-made fashion.';
  const defaultImage = `${siteUrl}/images/logo/logo.png`;
  
  // Final values
  const seoTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoImage = ogImage || defaultImage;
  const url = canonical || `${siteUrl}${router.asPath}`;
  
  // Generate JSON-LD for organization
  const organizationSchema = generateOrganizationStructuredData();
  
  // Generate JSON-LD for breadcrumbs if provided
  const breadcrumbsSchema = breadcrumbs ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`
    }))
  } : null;
  
  // Generate JSON-LD for product if provided
  const productSchema = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images && product.images.length > 0 ? product.images.map(img => img.startsWith('http') ? img : `${siteUrl}${img}`) : defaultImage,
    description: product.description,
    sku: product.sku,
    mpn: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand || siteName
    },
    offers: {
      '@type': 'Offer',
      url: url,
      priceCurrency: 'INR',
      price: product.price,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.average,
        reviewCount: product.rating.count
      }
    }),
    ...(product.reviews && product.reviews.length > 0 && {
      review: product.reviews.map(review => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating
        },
        author: {
          '@type': 'Person',
          name: review.userName
        },
        reviewBody: review.comment
      }))
    })
  } : null;

  return (
    <Head>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Keywords */}
      {keywords && <meta name="keywords" content={keywords.join(', ')} />}
      
      {/* Robots meta */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      
      {/* Mobile meta */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#4a6cf7" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      
      {/* JSON-LD Structured Data */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      
      {breadcrumbsSchema && (
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
        />
      )}
      
      {productSchema && (
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
    </Head>
  );
};

export default SEO; 