import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { isClerkPublishableKeySet } from "@/lib/clerk-config";
import { learningClerkKeys } from "@/lib/learning/clerk";
import {
  CONSENT_GURU_SITE_VERIFICATION,
  ConsentGuruInstall,
} from "@/components/site/consent-guru-install";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/components/theme/theme-script";
import { JsonLd } from "@/components/seo/json-ld";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  INDEXABLE_ROBOTS,
  SITE_NAME,
  SITE_URL,
  pageAlternates,
  socialMetadata,
} from "@/lib/site-metadata";
import { graphSchema, organizationSchema, websiteSchema } from "@/lib/structured-data";
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
    "consent management platform",
    "consent management software",
    "cookie consent",
    "DPDP consent management",
    "privacy preference center",
    "consent records",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  classification: "Consent Management Platform",
  robots: INDEXABLE_ROBOTS,
  other: {
    "cmp-site-verification": CONSENT_GURU_SITE_VERIFICATION,
  },
  formatDetection: { email: false, address: false, telephone: false },
  alternates: pageAlternates("/"),
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
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const learningPath = requestHeaders.get("x-cg-path") ?? "";
  const learningSignIn = learningPath.startsWith("/e-learning/sign-in") || learningPath.startsWith("/e-learning/sign-up");
  const learningPage = requestHeaders.get("x-cg-auth") === "learning";
  // The patient-facing WhatsApp consent flow is itself the consent experience;
  // do not stack the marketing site's cookie banner on top of it.
  const whatsappConsentPage = learningPath.startsWith("/consent/whatsapp");

  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://www.consentguru.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.consentguru.com" />
        {whatsappConsentPage ? null : <ConsentGuruInstall nonce={nonce} />}
        <script
          id="cmp-theme-bootstrap"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full min-w-0 max-w-full flex-col bg-background text-foreground">
        <JsonLd id="cmp-jsonld" data={graphSchema([organizationSchema(), websiteSchema()])} />
        <ThemeProvider>
          {learningSignIn ? (
            <LearningClerkProvider>{children}</LearningClerkProvider>
          ) : learningPage ? (
            children
          ) : (
            <OptionalClerkProvider>{children}</OptionalClerkProvider>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}

function LearningClerkProvider({ children }: { children: ReactNode }) {
  const { publishableKey, configured } = learningClerkKeys();
  if (!configured) return children;
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/e-learning/sign-in"
      signUpUrl="/e-learning/sign-up"
      signInFallbackRedirectUrl="/e-learning/session"
      signUpFallbackRedirectUrl="/e-learning/session"
      dynamic
      ui={ui}
    >
      {children}
    </ClerkProvider>
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
