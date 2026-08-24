import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import LegalDocument from "@/components/LegalDocument";
import danishPrivacyDocument from "@/content/legal/da/privacy";
import englishPrivacyDocument from "@/content/legal/en/privacy";

function getPrivacyDocument(locale: string) {
  return locale === "en" ? englishPrivacyDocument : danishPrivacyDocument;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  if (locale === "en") {
    return {
      title: "Privacy Policy | Gastronomia Pizza",
      description:
        "Information about how Gastronomia Pizza processes personal data.",
    };
  }

  return {
    title: "Privatlivspolitik | Gastronomia Pizza",
    description:
      "Information om Gastronomia Pizzas behandling af personoplysninger.",
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();

  return <LegalDocument document={getPrivacyDocument(locale)} />;
}
