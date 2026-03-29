// SEO meta tag generator for every page

const BASE_URL = process.env.NEXTAUTH_URL || 'https://snspokes.com';
const SITE_NAME = 'snspokes';
const DEFAULT_DESC = 'The definitive reference for ServiceNow Integration Hub spokes. Search 200+ spoke setup guides, actions, code examples and AI-powered explanations.';

export function getDefaultMeta() {
  return {
    title: `${SITE_NAME} — ServiceNow Integration Hub Reference`,
    description: DEFAULT_DESC,
    canonical: BASE_URL,
    og: {
      title: `${SITE_NAME} — ServiceNow Integration Hub Reference`,
      description: DEFAULT_DESC,
      image: `${BASE_URL}/og-default.png`,
      url: BASE_URL,
      type: 'website',
    },
  };
}

export function getSpokeMeta(spoke) {
  const title = `${spoke.name} Spoke — Setup Guide, Actions & Code Examples | ${SITE_NAME}`;
  const description = spoke.description
    ? `${spoke.description} Get setup steps, all actions, code examples and common errors for the ${spoke.name} ServiceNow Integration Hub spoke.`
    : `Complete reference for the ${spoke.name} ServiceNow Integration Hub spoke.`;

  return {
    title,
    description: description.substring(0, 160),
    canonical: `${BASE_URL}/spoke/${spoke.slug}`,
    og: {
      title,
      description: description.substring(0, 160),
      image: `${BASE_URL}/og-default.png`,
      url: `${BASE_URL}/spoke/${spoke.slug}`,
      type: 'article',
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: title,
      description,
      url: `${BASE_URL}/spoke/${spoke.slug}`,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

export function getSearchMeta() {
  return {
    title: `Search ServiceNow Spokes — AI-Powered Reference | ${SITE_NAME}`,
    description: 'Search any ServiceNow Integration Hub spoke. Get instant AI-powered setup guides, actions, code examples and error fixes.',
    canonical: `${BASE_URL}/search`,
    og: {
      title: `Search ServiceNow Spokes | ${SITE_NAME}`,
      description: 'AI-powered search for all ServiceNow Integration Hub spokes.',
      url: `${BASE_URL}/search`,
      type: 'website',
    },
  };
}

export function getSpokesMeta() {
  return {
    title: `All ServiceNow Integration Hub Spokes | ${SITE_NAME}`,
    description: 'Browse 200+ ServiceNow Integration Hub spokes. Complete reference with setup guides, actions, and code examples.',
    canonical: `${BASE_URL}/spokes`,
  };
}

// Meta component helper
export function MetaTags({ meta }) {
  return null; // Used as data only, rendered in Head
}
