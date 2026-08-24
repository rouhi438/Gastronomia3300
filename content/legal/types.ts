export interface LegalLink {
  label: string;
  href: string;
  external?: boolean;
}

export type LegalParagraph =
  | string
  | {
      label?: string;
      text?: string;
      lines?: string[];
      link?: LegalLink;
    };

export interface LegalSection {
  title: string;
  paragraphs?: LegalParagraph[];
  bullets?: string[];
}

export interface LegalDocumentContent {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
  updated: string;
}
