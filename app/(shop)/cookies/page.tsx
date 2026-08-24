import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import LegalDocument from "@/components/LegalDocument";
import danishCookiesDocument from "@/content/legal/da/cookies";
import englishCookiesDocument from "@/content/legal/en/cookies";

function getCookiesDocument(locale: string) {
  return locale === "en" ? englishCookiesDocument : danishCookiesDocument;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  if (locale === "en") {
    return {
      title: "Cookie Policy | Gastronomia Pizza",
      description:
        "Information about cookies and browser storage on Gastronomia Pizza’s website.",
    };
  }

  return {
    title: "Cookiepolitik | Gastronomia Pizza",
    description:
      "Information om cookies og browserlagring på Gastronomia Pizzas hjemmeside.",
  };
}

export default async function CookiesPage() {
  const locale = await getLocale();

  return <LegalDocument document={getCookiesDocument(locale)} />;
}
