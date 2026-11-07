import type { Metadata, Viewport } from 'next';
import { Newsreader, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { BRAND } from '@/lib/brand';

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-editorial',
  display: 'swap',
});

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.systemName}`,
    template: `%s | ${BRAND.name}`,
  },
  description: `${BRAND.name} PC parts sales and payments monitoring system.`,
  icons: {
    icon: [
      { url: '/icon.jpg' },
      { url: '/logo.jpg' },
    ],
    apple: [{ url: '/icon.jpg' }],
  },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F4F0' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1117' },
  ],
};

const themeInitScript = `(function(){try{var s=localStorage.getItem("hope-theme");var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";r.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full ${newsreader.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript,
          }}
        />
      </head>
      <body className="h-full flex flex-col font-sans bg-bg text-fg antialiased">
        {children}
      </body>
    </html>
  );
}
