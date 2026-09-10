import Script from 'next/script';
import './globals.css';

// 1. Viewport Config (Next.js 14+ warning fix)
export const viewport = {
  themeColor: '#D80027',
  width: 'device-width',
  initialScale: 1,
};

// 2. Metadata Configuration
export const metadata = {
  title: 'Absa Verification',
  description: 'Absa Banking Verification App',
  manifest: '/manifest.json',
  icons: {
    apple: 'https://absa-site.pages.dev/absa-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#FDF8FB]" suppressHydrationWarning>
        {children}

        {/* 3. Service Worker Registration */}
        <Script
          id="service-worker-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}