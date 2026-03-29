import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveriskpilot.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/government', '/docs', '/docs/pipeline', '/blog/', '/login', '/signup', '/terms', '/privacy'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/findings/',
          '/cases/',
          '/upload/',
          '/compliance/',
          '/reports/',
          '/settings/',
          '/teams/',
          '/clients/',
          '/billing/',
          '/notifications/',
          '/audit-log/',
          '/assets/',
          '/risk-exceptions/',
          '/portal/',
          '/ops/',
          '/demo/',
          '/pipelines/',
          '/_next/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
