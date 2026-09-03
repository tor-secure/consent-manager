import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/components/theme/theme-script";
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
  title: "ConsentFlow — Consent Management Platform",
  description:
    "ConsentFlow helps you manage user consent transparently across web, mobile and apps — GDPR, CCPA, LGPD and more.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script
          id="cmp-theme-bootstrap"
          strategy="beforeInteractive"
          nonce={nonce}
        >
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <ThemeProvider>
          <ClerkProvider dynamic>
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
