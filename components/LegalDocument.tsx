import type {
  LegalDocumentContent,
  LegalParagraph,
} from "@/content/legal/types";
import Link from "next/link";

import styles from "./LegalDocument.module.css";

interface LegalDocumentProps {
  document: LegalDocumentContent;
}

function Paragraph({ paragraph }: { paragraph: LegalParagraph }) {
  if (typeof paragraph === "string") {
    return <p>{paragraph}</p>;
  }

  return (
    <p>
      {paragraph.label && <strong>{paragraph.label}</strong>}

      {paragraph.label && paragraph.text ? " " : null}

      {paragraph.text}

      {paragraph.lines?.map((line, index) => (
        <span key={`${line}-${index}`}>
          {(paragraph.label || paragraph.text || index > 0) && <br />}
          {line}
        </span>
      ))}

      {paragraph.link && (
        <>
          {(paragraph.label || paragraph.text || paragraph.lines?.length) &&
            " "}

          {paragraph.link.external ? (
            <a href={paragraph.link.href} target="_blank" rel="noreferrer">
              {paragraph.link.label}
            </a>
          ) : (
            <Link href={paragraph.link.href}>{paragraph.link.label}</Link>
          )}
        </>
      )}
    </p>
  );
}

export default function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{document.eyebrow}</p>

          <h1>{document.title}</h1>

          <p className={styles.intro}>{document.intro}</p>
        </header>

        {document.sections.map((section) => (
          <section key={section.title} className={styles.card}>
            <h2>{section.title}</h2>

            {section.paragraphs?.map((paragraph, index) => (
              <Paragraph
                key={`${section.title}-${index}`}
                paragraph={paragraph}
              />
            ))}

            {section.bullets && (
              <ul>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className={styles.updated}>{document.updated}</p>
      </div>
    </main>
  );
}
