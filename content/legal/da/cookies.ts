import type { LegalDocumentContent } from "../types";

const cookiesDocument: LegalDocumentContent = {
  eyebrow: "Gastronomia Pizza",
  title: "Cookiepolitik",
  intro:
    "Her kan du læse, hvordan Gastronomia Pizza anvender cookies, browserlagring og eksterne tjenester på hjemmesiden.",

  sections: [
    {
      title: "1. Hvad er cookies og browserlagring?",
      paragraphs: [
        "Cookies er små tekstfiler, som en hjemmeside kan gemme i din browser. De kan blandt andet bruges til login, sikkerhed og til at huske dine valg.",
        "Hjemmesiden anvender også local storage. Det fungerer på samme måde som lokal lagring i browseren, men oplysningerne sendes ikke automatisk med hver internetforespørgsel.",
      ],
    },
    {
      title: "2. Nødvendige cookies",
      paragraphs: [
        "Vi anvender Supabase til brugerlogin og sessionshåndtering. Supabase kan gemme nødvendige cookies eller sessionstokens i browseren for at holde dig logget ind og beskytte din konto.",
        "Disse oplysninger er nødvendige, hvis du vælger at logge ind. De slettes eller udløber normalt, når sessionen udløber, du logger ud, eller browserens lagring ryddes.",
      ],
    },
    {
      title: "3. Lokal lagring på hjemmesiden",
      paragraphs: [
        {
          label: "cart",
          lines: [
            "Indeholder indholdet af din indkøbskurv samt valg som leveringsmetode og ønsket tidspunkt. Det gør det muligt at bevare kurven, hvis siden genindlæses.",
          ],
        },
        {
          label: "checkout-customer",
          lines: [
            "Anvendes midlertidigt til at overføre relevante kundeoplysninger til checkout-siden. Oplysningen fjernes igen af checkout-flowet.",
          ],
        },
        {
          label: "checkout-customer-details",
          lines: [
            "Kan indeholde kontakt- og leveringsoplysninger, som du har indtastet under bestillingen, så formularen kan gendannes eller udfyldes lettere.",
          ],
        },
        {
          label: "checkout-order-note",
          lines: [
            "Indeholder en eventuel kommentar, som du har skrevet til ordren.",
          ],
        },
        "Checkout-oplysningerne fjernes efter gennemført betalingsflow. Browserlagring kan også slettes manuelt via browserens indstillinger.",
        "Hvis du bruger en delt computer eller telefon, anbefaler vi, at du rydder browserdata efter bestillingen.",
      ],
    },
    {
      title: "4. Betaling via Nexi/Nets",
      paragraphs: [
        "Når du vælger onlinebetaling, bliver du sendt til en betalingsside, som drives af Nexi/Nets.",
        "Betalingsudbyderen kan anvende nødvendige cookies og teknisk lagring til betaling, sikkerhed, forebyggelse af misbrug og eventuel godkendelse af betalingskortet.",
        "Disse cookies og oplysninger administreres af Nexi/Nets efter betalingsudbyderens egne vilkår og privatlivspolitik.",
      ],
    },
    {
      title: "5. Login med Google eller Facebook",
      paragraphs: [
        "Google eller Facebook kontaktes først i forbindelse med login, hvis du selv vælger den pågældende loginmetode.",
        "Loginudbyderen kan i den forbindelse anvende egne cookies og sikkerhedsteknologier. Behandlingen sker efter udbyderens egne vilkår og privatlivspolitik.",
      ],
    },
    {
      title: "6. Google Maps",
      paragraphs: [
        "Kortet i hjemmesidens footer indlæses ikke automatisk. Google Maps kontaktes først, hvis du aktivt vælger at vise kortet.",
        "Når kortet aktiveres, kan Google modtage tekniske oplysninger som IP-adresse, browseroplysninger og tidspunkt samt anvende egne cookies eller andre lagringsteknologier.",
        "Hvis du ikke ønsker denne behandling, kan du undlade at aktivere kortet og i stedet bruge den almindelige adresse eller rutevejledningslinket.",
      ],
    },
    {
      title: "7. Statistik og markedsføring",
      paragraphs: [
        "Hjemmesiden anvender på nuværende tidspunkt ikke cookies til besøgsstatistik, personaliseret annoncering eller markedsføringssporing.",
        "Hvis sådanne tjenester tilføjes senere, skal cookiepolitikken og den tekniske samtykkeløsning opdateres, inden tjenesterne aktiveres.",
      ],
    },
    {
      title: "8. Sådan sletter du lagrede oplysninger",
      paragraphs: [
        "Du kan slette cookies og local storage via browserens indstillinger. Fremgangsmåden afhænger af den browser og enhed, du bruger.",
        "Hvis nødvendige loginoplysninger slettes, kan du blive logget ud. Hvis kurvens lagring slettes, bliver de gemte varer og valg fjernet.",
      ],
    },
    {
      title: "9. Kontakt og yderligere information",
      paragraphs: [
        "Hvis du har spørgsmål om cookies eller behandling af personoplysninger, kan du kontakte Gastronomia Pizza på telefon 40 40 41 83.",
        {
          text: "Du kan læse mere om vores behandling af personoplysninger i vores",
          link: {
            label: "privatlivspolitik",
            href: "/privacy",
          },
        },
      ],
    },
    {
      title: "10. Ændringer",
      paragraphs: [
        "Cookiepolitikken opdateres, hvis hjemmesidens lagringsteknologier eller eksterne tjenester ændres.",
      ],
    },
  ],

  updated: "Senest opdateret: august 2026",
};

export default cookiesDocument;
