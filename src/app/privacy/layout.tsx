import type { Metadata } from "next";
import { socialMetadata, SITE_URL } from "@/lib/social-metadata";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/breadcrumb-schema";

const title = "Privacy Policy";
const description =
  "DevBench privacy policy — all tools run client-side, cookie usage, analytics, and hosting information.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/privacy` },
  ...socialMetadata({ title, description, canonicalPath: "/privacy" }),
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Privacy", path: "/privacy" }])} />
      {children}
    </>
  );
}
