import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { isClerkPublishableKeySet } from "@/lib/clerk-config";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/components/theme/theme-script";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  socialMetadata,
} from "@/lib/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_TITLE,
    template: "%s — Consent Guru",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "consent manager",
    "DPDP",
    "GDPR",
    "CCPA",
    "CMP",
    "cookie consent",
    "Consent Guru",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/brand/consent-guru-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  ...socialMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          id="cmp-theme-bootstrap"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "SoftwareApplication",
                  name: SITE_NAME,
                  url: SITE_URL,
                  applicationCategory: "BusinessApplication",
                  description: DEFAULT_DESCRIPTION,
                  logo: `${SITE_URL}/brand/consent-guru-logo.svg`,
                  image: `${SITE_URL}/og/consent-guru-share.png`,
                  sameAs: [SITE_URL],
                },
                {
                  "@type": "WebSite",
                  name: SITE_NAME,
                  url: SITE_URL,
                  inLanguage: "en-IN",
                },
              ],
            }),
          }}
        />
        <ThemeProvider>
          <OptionalClerkProvider>{children}</OptionalClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function OptionalClerkProvider({ children }: { children: ReactNode }) {
  if (!isClerkPublishableKeySet()) {
    return children;
  }

  return (
    <ClerkProvider dynamic ui={ui}>
      {children}
    </ClerkProvider>
  );
}
