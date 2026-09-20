import type { Metadata } from "next";

export const SITE_URL = "https://consentguru.com";
export const SITE_NAME = "Consent Guru";
export const DEFAULT_TITLE = "Consent Guru — Consent Management Platform";
export const DEFAULT_DESCRIPTION =
  "Consent Guru helps you manage user consent transparently across web, mobile and apps — DPDP, GDPR, CCPA, LGPD and more.";
export const SHARE_IMAGE_PATH = "/og/consent-guru-share.png";
export const SHARE_IMAGE_ALT =
  "Consent Guru — Build trust. Collect consent. Stay compliant. consentguru.com";

export const shareImage = {
  url: SHARE_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: SHARE_IMAGE_ALT,
  type: "image/png",
} as const;

export function socialMetadata({
  title,
  description,
  path = "/",
  image = shareImage.url,
  imageAlt = shareImage.alt,
  type = "website",
  publishedTime,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const images = [
    {
      url: image,
      width: 1200,
      height: 630,
      alt: imageAlt,
      type: image.endsWith(".png") ? "image/png" : undefined,
    },
  ];

  return {
    openGraph: {
      type,
      locale: "en_IN",
      alternateLocale: ["en"],
      url,
      siteName: SITE_NAME,
      title,
      description,
      images,
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: SITE_NAME,
    },
  };
}

export const INDEXABLE_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export function pageAlternates(path = "/"): NonNullable<Metadata["alternates"]> {
  const canonical = path === "/" ? "/" : path.startsWith("/") ? path : `/${path}`;
  return {
    canonical,
    languages: {
      "en-IN": canonical,
      "x-default": canonical,
    },
  };
}

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
} as const;

export function unlistedPageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: NOINDEX_ROBOTS,
    ...socialMetadata({ title, description }),
  };
}
