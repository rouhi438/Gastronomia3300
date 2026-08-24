import type { LegalDocumentContent } from "../types";

const privacyDocument: LegalDocumentContent = {
  eyebrow: "Gastronomia Pizza",
  title: "Privatlivspolitik",
  intro:
    "Her kan du læse, hvordan Gastronomia Pizza indsamler, anvender og beskytter dine personoplysninger, når du bruger hjemmesiden, opretter en konto eller afgiver en bestilling.",

  sections: [
    {
      title: "1. Dataansvarlig",
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
        "Gastronomia Pizza er dataansvarlig for behandlingen af de personoplysninger, der er beskrevet i denne privatlivspolitik.",
      ],
    },
    {
      title: "2. Oplysninger vi behandler",
      paragraphs: [
        "Når du afgiver en bestilling, kan vi behandle oplysninger som navn, telefonnummer, e-mailadresse, leveringsadresse, ordrebemærkninger, valgte produkter, leveringstype og ønsket tidspunkt.",
        "Hvis du opretter en konto eller logger ind, kan vi også behandle bruger-id, loginoplysninger, profilnavn og oplysninger modtaget fra den loginudbyder, du selv vælger.",
        "Vi behandler desuden ordrestatus, betalingsmetode, transaktionsreferencer og oplysninger om eventuelle tilbagebetalinger. Vi modtager eller opbevarer ikke dit fulde betalingskortnummer eller din sikkerhedskode.",
        "Tekniske oplysninger som tidspunkt, IP-adresse, browseroplysninger, fejlmeddelelser og sikkerhedslogs kan blive behandlet for at drive og beskytte hjemmesiden.",
      ],
    },
    {
      title: "3. Formål og behandlingsgrundlag",
      paragraphs: [
        "Oplysninger om din bestilling behandles for at modtage, tilberede, levere eller udlevere ordren, gennemføre betaling og yde kundeservice. Behandlingen er nødvendig for at opfylde aftalen med dig.",
        "Visse oplysninger behandles for at overholde lovkrav, herunder bogførings- og dokumentationskrav.",
        "Tekniske logs og sikkerhedsoplysninger behandles på baggrund af vores legitime interesse i at beskytte hjemmesiden, forebygge misbrug og løse tekniske problemer.",
        "Hvis en behandling kræver samtykke, kan du til enhver tid trække samtykket tilbage. Tilbagetrækningen påvirker ikke lovligheden af den behandling, der allerede er foretaget.",
      ],
    },
    {
      title: "4. Betaling",
      paragraphs: [
        "Onlinebetaling behandles af Nexi/Nets. Du bliver sendt til betalingsudbyderens betalingsside, hvor betalingsoplysninger indtastes og behandles direkte.",
        "Gastronomia Pizza modtager kun de nødvendige betalingsreferencer og statusoplysninger, som bruges til at knytte betalingen til ordren og håndtere eventuelle tilbagebetalinger.",
      ],
    },
    {
      title: "5. Login via eksterne udbydere",
      paragraphs: [
        "Hvis du vælger at logge ind med eksempelvis Google eller Facebook, modtager vi de begrænsede profiloplysninger, som udbyderen deler efter dit valg og dine indstillinger hos udbyderen.",
        "Den valgte loginudbyder behandler samtidig oplysninger efter sin egen privatlivspolitik.",
      ],
    },
    {
      title: "6. Modtagere og databehandlere",
      paragraphs: [
        "Vi anvender leverandører til blandt andet hosting, database, brugerlogin, betaling, e-mail og teknisk drift. Disse leverandører må kun behandle oplysninger i forbindelse med deres aftalte opgaver.",
        "De relevante leverandører omfatter blandt andet Supabase, Vercel og Nexi/Nets. Google eller Meta kan desuden modtage oplysninger, hvis du selv vælger deres loginløsninger eller aktiverer indhold fra deres tjenester.",
        "Hvis oplysninger behandles uden for EU/EØS, skal overførslen ske på et gyldigt overførselsgrundlag og med relevante beskyttelsesforanstaltninger.",
      ],
    },
    {
      title: "7. Opbevaring og sletning",
      paragraphs: [
        "Vi opbevarer personoplysninger, så længe det er nødvendigt for at behandle ordren, yde kundeservice, dokumentere betalinger og overholde gældende lovgivning.",
        "Regnskabs- og betalingsoplysninger kan blive opbevaret i den periode, som bogføringslovgivningen kræver. Andre oplysninger slettes eller anonymiseres, når de ikke længere er nødvendige.",
        {
          text: "Oplysninger gemt lokalt i din browser kan fjernes via browserens indstillinger. Du kan læse mere i vores",
          link: {
            label: "cookiepolitik",
            href: "/cookies",
          },
        },
      ],
    },
    {
      title: "8. Dine rettigheder",
      paragraphs: [
        "Du kan efter omstændighederne anmode om indsigt i dine personoplysninger samt få urigtige oplysninger rettet.",
        "Du kan også anmode om sletning, begrænsning eller udlevering af oplysninger og gøre indsigelse mod visse behandlinger. Rettighederne er ikke absolutte og kan være begrænset af lovkrav eller nødvendige dokumentationshensyn.",
        "Henvendelser om dine rettigheder kan ske på telefon 40 40 41 83 eller skriftligt til restaurantens adresse.",
      ],
    },
    {
      title: "9. Klage",
      paragraphs: [
        "Hvis du er utilfreds med vores behandling af dine personoplysninger, anbefaler vi, at du først kontakter os.",
        {
          text: "Du kan også indgive en klage til Datatilsynet via",
          link: {
            label: "datatilsynet.dk",
            href: "https://www.datatilsynet.dk",
            external: true,
          },
        },
      ],
    },
    {
      title: "10. Automatiske afgørelser",
      paragraphs: [
        "Vi anvender ikke dine personoplysninger til automatiske afgørelser eller profilering, som har retsvirkning eller tilsvarende væsentlig betydning for dig.",
      ],
    },
    {
      title: "11. Ændringer",
      paragraphs: [
        "Privatlivspolitikken kan blive opdateret, hvis hjemmesiden, leverandørerne eller vores behandling af personoplysninger ændres. Den aktuelle version vil altid være tilgængelig på denne side.",
      ],
    },
  ],

  updated: "Senest opdateret: august 2026",
};

export default privacyDocument;
