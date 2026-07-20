import './globals.css';

export const metadata = {
  title: {
    default: 'KeepPulse Pro | Render & Supabase Uptime Sentinel',
    template: '%s | KeepPulse Pro'
  },
  description: 'Next-generation keep-alive bot & uptime monitoring dashboard for Render apps, Supabase databases, and custom REST APIs.',
  keywords: ['keep-alive bot', 'render keep alive', 'supabase monitor', 'uptime checker', 'cron sentinel'],
  authors: [{ name: 'KeepPulse PRO Engineering' }],
  icons: {
    icon: '/images/logo.svg',
    apple: '/images/logo.svg'
  },
  openGraph: {
    title: 'KeepPulse Pro | Render & Supabase Uptime Sentinel',
    description: 'Automated keep-alive bot & uptime monitoring engine for developer projects.',
    type: 'website',
    images: [
      {
        url: '/images/logo.svg',
        width: 512,
        height: 512,
        alt: 'KeepPulse PRO Sentinel Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KeepPulse Pro | Render & Supabase Uptime Sentinel',
    description: 'Automated keep-alive bot & uptime monitoring engine for developer projects.',
    images: ['/images/logo.svg']
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="ambient-backdrop">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
          <div className="glow-orb orb-3"></div>
          <div className="grid-pattern"></div>
        </div>

        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
