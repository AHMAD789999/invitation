import Script from 'next/script';
import './globals.css';

// 1. Viewport Config (Next.js 14+ warning fix)
export const viewport = {
  themeColor: '#0b2545',
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
      <body className="antialiased bg-[#f8fafc]" suppressHydrationWarning>
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
```eof

Your layout file has been updated with the new theme colors and background palette. Let me know if you need any further adjustments!Here is the updated Next.js root layout with the theme color updated to **`#B3001F`** (a deeper, rich shade of red) across both the viewport configuration and the background color styling.

```jsx
import Script from 'next/script';
import './globals.css';

// 1. Viewport Config (Next.js 14+ warning fix)
export const viewport = {
  themeColor: '#B3001F',
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
      <body className="antialiased bg-[#FFF5F6]" suppressHydrationWarning>
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
