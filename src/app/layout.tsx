// Copyright (c) 2026 DevBench contributors. MIT License.
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { TOOLS } from "@/lib/tools-registry";
import LazyCommandPalette from "@/components/LazyCommandPalette";
import DevbenchClientProviders from "@/components/DevbenchClientProviders";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import JsonLd from "@/components/JsonLd";
import { organizationSchema } from "@/lib/site-organization-schema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.devbench.co.in"),
  title: {
    default: `DevBench — ${TOOLS.length}+ Free Online Developer Tools | No Signup`,
    template: "%s | DevBench",
  },
  description:
    `${TOOLS.length}+ free online developer tools — JWT debugger, PDF merge & split, Base64, regex tester, UUID generator, password generator, EMI calculator, and more. No signup, runs in your browser.`,
  authors: [{ name: "DevBench", url: "https://www.devbench.co.in" }],
  creator: "DevBench IN — With ❤️ from India",
  publisher: "DevBench IN — With ❤️ from India",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DevBench",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.devbench.co.in",
    siteName: "DevBench",
    title: "DevBench — 143+ Free Online Developer Tools",
    description:
      "143+ free online developer tools — JWT debugger, PDF merge, Base64, regex tester, UUID generator, EMI calculator, and more. No signup, runs in your browser.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevBench — 143+ Free Online Developer Tools",
    description:
      "143+ free online developer tools — JWT debugger, PDF merge, Base64, regex tester, UUID generator, EMI calculator, and more. No signup, runs in your browser.",
    site: "@devbench",
    creator: "@devbench",
  },
  alternates: {
    canonical: "https://www.devbench.co.in",
  },
  verification: {
    google: "IgIfgAzxEG7NcxiC8hTObe1nFIY-WNqIAjS2mBi0h8o",
  },
  other: {
    "x-src-ref": "U2FpIEJoYXJnYXYgUg==",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Safe static scripts below — __html is a string literal, not user input. lgtm[js/xss] */}
        {/* Sync theme on <html> before CSS/paint so Tailwind dark: matches preference (see globals.css @custom-variant) */}
        <script
          dangerouslySetInnerHTML={{ // CodeQL[js/xss]
            __html: `(function(){try{var t=localStorage.getItem("theme"),r=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"){r.classList.add("dark");r.classList.remove("light");}else if(t==="light"){r.classList.remove("dark");r.classList.add("light");}else{r.classList.toggle("dark",m);r.classList.remove("light");}}catch(e){}})();`,
          }}
        />
        {/* Preconnect hints — only origins this page actually requests */}
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        {/* Inline critical above-the-fold styles to prevent render-blocking on LCP element */}
        {/* CodeQL[js/xss] */}
        <style dangerouslySetInnerHTML={{ __html: `body{background:#fafafa;color:#111111}html.dark body{background:#09090b;color:#fafafa}@media(prefers-color-scheme:dark){html:not(.light) body{background:#09090b;color:#fafafa}}` }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd data={organizationSchema} />
        {/* Skip link — visible only when focused; first tab stop for keyboard users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        {/* Google Tag Manager — noscript fallback */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NBTV4W35"
            title="Google Tag Manager"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
          <div style={{ padding: "1rem", textAlign: "center", fontFamily: "system-ui" }}>
            DevBench tools require JavaScript to run in your browser. Please enable JS to use them.
          </div>
        </noscript>
        <DevbenchClientProviders>
          {children}
        </DevbenchClientProviders>
        <LazyCommandPalette tools={TOOLS} />
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
      {/* Google Tag Manager — must be outside <head>, injected client-side after hydration */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ // CodeQL[js/xss]
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NBTV4W35');`,
        }}
      />
    </html>
  );
}
