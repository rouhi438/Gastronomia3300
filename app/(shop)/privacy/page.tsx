import Link from "next/link";
import styles from "../terms/terms.module.css";

export const metadata = {
  title: "Privatlivspolitik | Gastronomia Pizza",
  description:
    "Information om Gastronomia Pizzas behandling af personoplysninger.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Gastronomia Pizza</p>

          <h1>Privatlivspolitik</h1>

          <p className={styles.intro}>
            Her kan du læse, hvordan Gastronomia Pizza indsamler, anvender og
            beskytter dine personoplysninger, når du bruger hjemmesiden,
            opretter en konto eller afgiver en bestilling.
          </p>
        </header>

        <section className={styles.card}>
          <h2>1. Dataansvarlig</h2>

          <p>
            <strong>Gastronomia Pizza</strong>
            <br />
            Hillerødvej 38A
            <br />
            3300 Frederiksværk
            <br />
            CVR: 40954627
            <br />
            Telefon: 40 40 41 83
          </p>

          <p>
            Gastronomia Pizza er dataansvarlig for behandlingen af de
            personoplysninger, der er beskrevet i denne privatlivspolitik.
          </p>
        </section>

        <section className={styles.card}>
          <h2>2. Oplysninger vi behandler</h2>

          <p>
            Når du afgiver en bestilling, kan vi behandle oplysninger som navn,
            telefonnummer, e-mailadresse, leveringsadresse, ordrebemærkninger,
            valgte produkter, leveringstype og ønsket tidspunkt.
          </p>

          <p>
            Hvis du opretter en konto eller logger ind, kan vi også behandle
            bruger-id, loginoplysninger, profilnavn og oplysninger modtaget fra
            den loginudbyder, du selv vælger.
          </p>

          <p>
            Vi behandler desuden ordrestatus, betalingsmetode,
            transaktionsreferencer og oplysninger om eventuelle
            tilbagebetalinger. Vi modtager eller opbevarer ikke dit fulde
            betalingskortnummer eller din sikkerhedskode.
          </p>

          <p>
            Tekniske oplysninger som tidspunkt, IP-adresse, browseroplysninger,
            fejlmeddelelser og sikkerhedslogs kan blive behandlet for at drive
            og beskytte hjemmesiden.
          </p>
        </section>

        <section className={styles.card}>
          <h2>3. Formål og behandlingsgrundlag</h2>

          <p>
            Oplysninger om din bestilling behandles for at modtage, tilberede,
            levere eller udlevere ordren, gennemføre betaling og yde
            kundeservice. Behandlingen er nødvendig for at opfylde aftalen med
            dig.
          </p>

          <p>
            Visse oplysninger behandles for at overholde lovkrav, herunder
            bogførings- og dokumentationskrav.
          </p>

          <p>
            Tekniske logs og sikkerhedsoplysninger behandles på baggrund af
            vores legitime interesse i at beskytte hjemmesiden, forebygge
            misbrug og løse tekniske problemer.
          </p>

          <p>
            Hvis en behandling kræver samtykke, kan du til enhver tid trække
            samtykket tilbage. Tilbagetrækningen påvirker ikke lovligheden af
            den behandling, der allerede er foretaget.
          </p>
        </section>

        <section className={styles.card}>
          <h2>4. Betaling</h2>

          <p>
            Onlinebetaling behandles af Nexi/Nets. Du bliver sendt til
            betalingsudbyderens betalingsside, hvor betalingsoplysninger
            indtastes og behandles direkte.
          </p>

          <p>
            Gastronomia Pizza modtager kun de nødvendige betalingsreferencer og
            statusoplysninger, som bruges til at knytte betalingen til ordren og
            håndtere eventuelle tilbagebetalinger.
          </p>
        </section>

        <section className={styles.card}>
          <h2>5. Login via eksterne udbydere</h2>

          <p>
            Hvis du vælger at logge ind med eksempelvis Google eller Facebook,
            modtager vi de begrænsede profiloplysninger, som udbyderen deler
            efter dit valg og dine indstillinger hos udbyderen.
          </p>

          <p>
            Den valgte loginudbyder behandler samtidig oplysninger efter sin
            egen privatlivspolitik.
          </p>
        </section>

        <section className={styles.card}>
          <h2>6. Modtagere og databehandlere</h2>

          <p>
            Vi anvender leverandører til blandt andet hosting, database,
            brugerlogin, betaling, e-mail og teknisk drift. Disse leverandører
            må kun behandle oplysninger i forbindelse med deres aftalte opgaver.
          </p>

          <p>
            De relevante leverandører omfatter blandt andet Supabase, Vercel og
            Nexi/Nets. Google eller Meta kan desuden modtage oplysninger, hvis
            du selv vælger deres loginløsninger eller aktiverer indhold fra
            deres tjenester.
          </p>

          <p>
            Hvis oplysninger behandles uden for EU/EØS, skal overførslen ske på
            et gyldigt overførselsgrundlag og med relevante
            beskyttelsesforanstaltninger.
          </p>
        </section>

        <section className={styles.card}>
          <h2>7. Opbevaring og sletning</h2>

          <p>
            Vi opbevarer personoplysninger, så længe det er nødvendigt for at
            behandle ordren, yde kundeservice, dokumentere betalinger og
            overholde gældende lovgivning.
          </p>

          <p>
            Regnskabs- og betalingsoplysninger kan blive opbevaret i den
            periode, som bogføringslovgivningen kræver. Andre oplysninger
            slettes eller anonymiseres, når de ikke længere er nødvendige.
          </p>

          <p>
            Oplysninger gemt lokalt i din browser kan fjernes via browserens
            indstillinger. Du kan læse mere i vores{" "}
            <Link href="/cookies">cookiepolitik</Link>.
          </p>
        </section>

        <section className={styles.card}>
          <h2>8. Dine rettigheder</h2>

          <p>
            Du kan efter omstændighederne anmode om indsigt i dine
            personoplysninger samt få urigtige oplysninger rettet.
          </p>

          <p>
            Du kan også anmode om sletning, begrænsning eller udlevering af
            oplysninger og gøre indsigelse mod visse behandlinger. Rettighederne
            er ikke absolutte og kan være begrænset af lovkrav eller nødvendige
            dokumentationshensyn.
          </p>

          <p>
            Henvendelser om dine rettigheder kan ske på telefon 40 40 41 83
            eller skriftligt til restaurantens adresse.
          </p>
        </section>

        <section className={styles.card}>
          <h2>9. Klage</h2>

          <p>
            Hvis du er utilfreds med vores behandling af dine personoplysninger,
            anbefaler vi, at du først kontakter os.
          </p>

          <p>
            Du kan også indgive en klage til Datatilsynet via{" "}
            <a
              href="https://www.datatilsynet.dk"
              target="_blank"
              rel="noreferrer"
            >
              datatilsynet.dk
            </a>
            .
          </p>
        </section>

        <section className={styles.card}>
          <h2>10. Automatiske afgørelser</h2>

          <p>
            Vi anvender ikke dine personoplysninger til automatiske afgørelser
            eller profilering, som har retsvirkning eller tilsvarende væsentlig
            betydning for dig.
          </p>
        </section>

        <section className={styles.card}>
          <h2>11. Ændringer</h2>

          <p>
            Privatlivspolitikken kan blive opdateret, hvis hjemmesiden,
            leverandørerne eller vores behandling af personoplysninger ændres.
            Den aktuelle version vil altid være tilgængelig på denne side.
          </p>
        </section>

        <p className={styles.updated}>Senest opdateret: august 2026</p>
      </div>
    </main>
  );
}
