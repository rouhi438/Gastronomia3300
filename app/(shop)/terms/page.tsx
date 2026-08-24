import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import LegalDocument from "@/components/LegalDocument";
import danishTermsDocument from "@/content/legal/da/terms";
import englishTermsDocument from "@/content/legal/en/terms";

function getTermsDocument(locale: string) {
  return locale === "en" ? englishTermsDocument : danishTermsDocument;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  if (locale === "en") {
    return {
      title: "Terms and Conditions | Gastronomia Pizza",
      description:
        "Terms and conditions for online ordering from Gastronomia Pizza.",
    };
  }

  return {
    title: "Handelsbetingelser | Gastronomia Pizza",
    description:
      "Handelsbetingelser for online bestilling hos Gastronomia Pizza.",
  };
}

export default async function TermsPage() {
  const locale = await getLocale();

  return <LegalDocument document={getTermsDocument(locale)} />;
}
