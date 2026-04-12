// Dynamic sitemap for SEO
import { query } from '../lib/db';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3001';

function generateSitemap(spokes) {
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/search', priority: '0.9', changefreq: 'daily' },
    { url: '/spokes', priority: '0.9', changefreq: 'daily' },
    { url: '/docs', priority: '0.7', changefreq: 'weekly' },
    { url: '/login', priority: '0.5', changefreq: 'monthly' },
    { url: '/register', priority: '0.5', changefreq: 'monthly' },
    { url: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { url: '/tools/code-generator', priority: '0.7', changefreq: 'weekly' },
    { url: '/tools/error-finder', priority: '0.7', changefreq: 'weekly' },
    { url: '/changelog', priority: '0.6', changefreq: 'weekly' },
    { url: '/status', priority: '0.5', changefreq: 'hourly' },
    { url: '/submit-spoke', priority: '0.6', changefreq: 'monthly' },
  ];

  const spokePages = spokes.map(s => ({
    url: `/spoke/${s.slug}`,
    priority: '0.8',
    changefreq: 'weekly',
    lastmod: s.updated_at || s.created_at,
  }));

  const allPages = [...staticPages, ...spokePages];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <priority>${p.priority}</priority>
    <changefreq>${p.changefreq}</changefreq>
    ${p.lastmod ? `<lastmod>${new Date(p.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;
}

export default async function Sitemap() { return null; }

export async function getServerSideProps({ res }) {
  try {
    const result = await query(
      'SELECT slug, updated_at, created_at FROM sn_spokes ORDER BY view_count DESC LIMIT 500'
    );
    const sitemap = generateSitemap(result.rows);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.write(sitemap);
    res.end();
  } catch {
    res.status(500).end();
  }
  return { props: {} };
}
