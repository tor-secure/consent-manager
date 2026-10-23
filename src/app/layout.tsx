import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { isClerkPublishableKeySet } from "@/lib/clerk-config";
import { LearningClerkProvider } from "@/components/learning/learning-clerk-provider";
import {
  CONSENT_GURU_SITE_VERIFICATION,
  ConsentGuruInstall,
} from "@/components/site/consent-guru-install";
import { PageExperience } from "@/components/ui/page-experience";
import { PageTransition } from "@/components/ui/page-transition";
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
import "./public-design.css";
import "./experience.css";
import "./dpdp-editorial.css";
import "./privacy-journey.css";
import "./privacy-experience.css";

const manrope = localFont({ src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2", variable: "--font-manrope", display: "swap", weight: "200 800" });
const editorial = localFont({ src: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", variable: "--font-editorial", display: "swap", weight: "400", style: "italic" });

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
  const onLearning =
    requestHeaders.get("x-cg-auth") === "learning" ||
    learningPath.startsWith("/e-learning") ||
    learningPath.startsWith("/api/learning");
  const learningSignIn =
    learningPath.startsWith("/e-learning/sign-in") || learningPath.startsWith("/e-learning/sign-up");
  // Cookie banner must not cover the patient WhatsApp flow or the separate e-learning Clerk login.
  const skipMarketingCmp =
    learningPath.startsWith("/consent/whatsapp") || learningPath.startsWith("/e-learning") || onLearning;

  // Rendered here rather than from a root template.tsx: Next 16.3 emits a
  // template's client chunk as a <script> without the CSP nonce, which the
  // strict policy then blocks, so no page hydrates.
  const page = <PageTransition>{children}</PageTransition>;

  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${manrope.variable} ${editorial.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://www.consentguru.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.consentguru.com" />
        {skipMarketingCmp ? null : <ConsentGuruInstall nonce={nonce} />}
        <script
          id="cmp-theme-bootstrap"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full min-w-0 max-w-full flex-col bg-background text-foreground">
        <JsonLd id="cmp-jsonld" data={graphSchema([organizationSchema(), websiteSchema()])} />
        <ThemeProvider>
          <PageExperience />
          {onLearning ? (
            // Never mount the workspace/dashboard Clerk app on e-learning routes.
            // Sign-in/up also wrap LearningClerkProvider in their own layouts.
            learningSignIn ? <LearningClerkProvider>{page}</LearningClerkProvider> : page
          ) : (
            <OptionalClerkProvider>{page}</OptionalClerkProvider>
          )}
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
