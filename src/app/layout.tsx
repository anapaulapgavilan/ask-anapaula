import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const previewUrl = new URL(
  "https://ask-anapaula-git-preview-private-content-review-ana-paula13.vercel.app",
);
const title = "Ask Ana Paula | Professional profile";
const description =
  "A bilingual professional profile of Ana Paula Pérez-Gavilán Pliego. AI chat is not yet available.";

export const metadata: Metadata = {
  metadataBase: previewUrl,
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Ask Ana Paula",
    title,
    description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Ask Ana Paula private preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
