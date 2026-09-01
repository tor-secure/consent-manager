import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Consent Manager",
  description:
    "Consent management platform for websites and organizations. Publish notices, govern vendors, and keep audit-ready records.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        >
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <ThemeProvider>
          <ClerkProvider>
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
