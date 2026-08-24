import type { LegalDocumentContent } from "../types";

const termsDocument: LegalDocumentContent = {
  eyebrow: "Gastronomia Pizza",
  title: "Handelsbetingelser",
  intro:
    "Vi anbefaler, at du læser vores handelsbetingelser, inden du afgiver en bestilling. Her finder du information om bestilling, betaling, afhentning, levering og øvrige vilkår hos Gastronomia Pizza.",

  sections: [
    {
      title: "1. Virksomhedsoplysninger",
      paragraphs: [
        {
          label: "Gastronomia Pizza",
          lines: [
            "Hillerødvej 38A",
            "3300 Frederiksværk",
            "CVR: 40954627",
            "Telefon: 40 40 41 83",
          ],
        },
      ],
    },
    {
      title: "2. Bestilling",
      paragraphs: [
        "Når du afgiver en bestilling via vores hjemmeside, er det dit ansvar at kontrollere, at de valgte varer, antal, afhentnings- eller leveringsoplysninger samt kontaktoplysninger er korrekte.",
        "Når bestillingen er gennemført, modtager du en bekræftelse på din ordre.",
      ],
    },
    {
      title: "3. Priser",
      paragraphs: [
        "Alle priser på hjemmesiden er angivet i danske kroner (DKK) og inklusive moms.",
        "Den samlede pris for ordren vises, inden betalingen gennemføres. Eventuelle leveringsgebyrer eller andre gebyrer vil fremgå inden betaling.",
      ],
    },
    {
      title: "4. Betaling",
      paragraphs: [
        "Online betaling gennemføres via Nets Easy. De tilgængelige betalingsmetoder vises i betalingsvinduet.",
        "Gastronomia Pizza modtager eller opbevarer ikke dine betalingskortoplysninger. Betalingsoplysninger behandles direkte gennem betalingsudbyderen.",
      ],
    },
    {
      title: "5. Afhentning",
      paragraphs: [
        "Ved bestilling til afhentning skal ordren afhentes hos:",
        {
          label: "Gastronomia Pizza",
          lines: ["Hillerødvej 38A", "3300 Frederiksværk"],
        },
        "Det valgte afhentningstidspunkt fremgår af din bestilling. Tidspunktet er vejledende, og mindre forsinkelser kan forekomme i perioder med stor travlhed.",
      ],
    },
    {
      title: "6. Levering",
      paragraphs: [
        "Hvis levering er tilgængelig for din adresse, kan levering vælges under bestillingen.",
        "Den forventede leveringstid vises i forbindelse med bestillingen. Leveringstiden er vejledende og kan blandt andet påvirkes af travlhed, trafik og vejrforhold.",
        "Kunden er ansvarlig for at angive korrekt leveringsadresse og kontaktoplysninger.",
      ],
    },
    {
      title: "7. Ændring eller annullering af ordre",
      paragraphs: [
        "Hvis du opdager en fejl i din bestilling eller ønsker at ændre den, skal du kontakte os hurtigst muligt på 40 40 41 83.",
        "Muligheden for at ændre eller annullere en ordre afhænger blandt andet af, om tilberedningen af ordren allerede er påbegyndt.",
      ],
    },
    {
      title: "8. Fortrydelsesret",
      paragraphs: [
        "Ved køb af mad og andre varer, som på grund af deres art hurtigt forringes eller bliver for gamle, gælder den almindelige 14-dages fortrydelsesret som udgangspunkt ikke.",
        "En bestilling kan derfor ikke returneres efter levering eller afhentning alene på grund af fortrydelse.",
      ],
    },
    {
      title: "9. Fejl og reklamation",
      paragraphs: [
        "Hvis der er fejl eller mangler ved din ordre, skal du kontakte Gastronomia Pizza så hurtigt som muligt på 40 40 41 83.",
        "Oplys gerne ordrenummer og en beskrivelse af problemet, så vi kan behandle henvendelsen hurtigst muligt.",
      ],
    },
    {
      title: "10. Tilbagebetaling",
      paragraphs: [
        "Hvis der efter aftale skal ske en hel eller delvis tilbagebetaling, vil tilbagebetalingen som udgangspunkt ske via den betalingsmetode, der blev anvendt ved købet.",
        "Behandlingstiden kan afhænge af betalingsudbyderen og kundens bank.",
      ],
    },
    {
      title: "11. Personoplysninger",
      paragraphs: [
        "Personoplysninger, som du afgiver i forbindelse med en bestilling, anvendes til at behandle og levere din ordre samt til nødvendig kundeservice.",
        {
          text: "Yderligere information om behandling af personoplysninger kan findes i vores",
          link: {
            label: "privatlivspolitik",
            href: "/privacy",
          },
        },
      ],
    },
    {
      title: "12. Kontakt",
      paragraphs: [
        "Hvis du har spørgsmål til en ordre eller disse handelsbetingelser, kan du kontakte:",
        {
          label: "Gastronomia Pizza",
          lines: [
            "Hillerødvej 38A, 3300 Frederiksværk",
            "Telefon: 40 40 41 83",
          ],
        },
      ],
    },
  ],

  updated: "Senest opdateret: august 2026",
};

export default termsDocument;
