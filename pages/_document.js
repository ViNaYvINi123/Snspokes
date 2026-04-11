import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" style={{ scrollBehavior:'smooth' }}>
      <Head>
        <meta name="description" content="Free AI-powered toolkit for ServiceNow developers. Search 200+ spokes, generate code, debug errors." />
        <meta name="keywords" content="ServiceNow, Integration Hub, GlideRecord, spokes, code generator, developer tools" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="snspokes — ServiceNow Developer Toolkit" />
        <meta property="og:description" content="AI-powered tools for ServiceNow developers. Search spokes, generate code, debug errors — all free." />
        <meta property="og:url" content="https://snspokes.com" />
        <meta property="og:image" content="https://snspokes.com/logo.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://snspokes.com" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <meta name="theme-color" content="#6c63ff" />

        {/* Fonts — Bricolage Grotesque + DM Sans + JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');` }} />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
