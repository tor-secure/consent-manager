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
    },
  };
}
