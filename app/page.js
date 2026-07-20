import MainClient from '@/components/MainClient';

export const metadata = {
  title: 'Sentinel Control Center | KeepPulse PRO',
  description: 'Automated keep-alive engine & real-time telemetry dashboard for Render apps and Supabase databases.',
  icons: {
    icon: '/images/logo.svg',
    apple: '/images/logo.svg'
  },
  openGraph: {
    title: 'Sentinel Control Center | KeepPulse PRO',
    description: 'Keep your Render free tier web apps and Supabase projects awake automatically 24/7.',
    url: 'https://keeppulse.pro',
    siteName: 'KeepPulse PRO',
    type: 'website',
    images: [
      {
        url: '/images/logo.svg',
        width: 512,
        height: 512,
        alt: 'KeepPulse PRO Sentinel Logo'
      }
    ]
  }
};

export default function HomePage() {
  return <MainClient />;
}
