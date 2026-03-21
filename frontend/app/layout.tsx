import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Novel Editor",
  description: "Novel Editor",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Material Symbols Outlined を script で非同期挿入している理由:
          - <link rel="stylesheet"> はレンダーブロッキングになるため、初回表示速度の改善を優先してスクリプト経由で遅延読み込みしている。
          トレードオフ:
          - FOUC（Flash of Unstyled Content）: フォント読み込み前にアイコンが一瞬テキストで表示される可能性がある。
          - CSP（Content Security Policy）: script-src に 'unsafe-inline' が必要になるため、CSP を厳格化する場合は
            nonce ベースの CSP か、<link rel="preload"> + rel="stylesheet" に戻す対応が必要。
        */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';document.head.appendChild(l);})();`
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const savedTheme = localStorage.getItem('theme');
              if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
              } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
              }
            })()
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
