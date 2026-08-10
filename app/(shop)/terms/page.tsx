import styles from "./terms.module.css";

export const metadata = {
  title: "Handelsbetingelser | Gastronomia Pizza",
  description:
    "Handelsbetingelser for online bestilling hos Gastronomia Pizza.",
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Gastronomia Pizza</p>

          <h1>Handelsbetingelser</h1>

          <p className={styles.intro}>
            Vi anbefaler, at du læser vores handelsbetingelser, inden du afgiver
            en bestilling. Her finder du information om bestilling, betaling,
            afhentning, levering og øvrige vilkår hos Gastronomia Pizza.
          </p>
        </header>

        <section className={styles.card}>
          <h2>1. Virksomhedsoplysninger</h2>

          <p>
            <strong>Gastronomia Pizza</strong>
            <br />
            Hillerødvej 38A
            <br />
            3300 Frederiksværk
          </p>

          <p>
            <strong>CVR:</strong> 40954627
            <br />
            <strong>Telefon:</strong> 40 40 41 83
          </p>
        </section>

        <section className={styles.card}>
          <h2>2. Bestilling</h2>

          <p>
            Når du afgiver en bestilling via vores hjemmeside, er det dit ansvar
            at kontrollere, at de valgte varer, antal, afhentnings- eller
            leveringsoplysninger samt kontaktoplysninger er korrekte.
          </p>

          <p>
            Når bestillingen er gennemført, modtager du en bekræftelse på din
            ordre.
          </p>
        </section>

        <section className={styles.card}>
          <h2>3. Priser</h2>

          <p>
            Alle priser på hjemmesiden er angivet i danske kroner (DKK) og
            inklusive moms.
          </p>

          <p>
            Den samlede pris for ordren vises, inden betalingen gennemføres.
            Eventuelle leveringsgebyrer eller andre gebyrer vil fremgå inden
            betaling.
          </p>
        </section>

        <section className={styles.card}>
          <h2>4. Betaling</h2>

          <p>
            Online betaling gennemføres via Nets Easy. De tilgængelige
            betalingsmetoder vises i betalingsvinduet.
          </p>

          <p>
            Gastronomia Pizza modtager eller opbevarer ikke dine
            betalingskortoplysninger. Betalingsoplysninger behandles direkte
            gennem betalingsudbyderen.
          </p>
        </section>

        <section className={styles.card}>
          <h2>5. Afhentning</h2>

          <p>Ved bestilling til afhentning skal ordren afhentes hos:</p>

          <p>
            <strong>Gastronomia Pizza</strong>
            <br />
            Hillerødvej 38A
            <br />
            3300 Frederiksværk
          </p>

          <p>
            Det valgte afhentningstidspunkt fremgår af din bestilling.
            Tidspunktet er vejledende, og mindre forsinkelser kan forekomme i
            perioder med stor travlhed.
          </p>
        </section>

        <section className={styles.card}>
          <h2>6. Levering</h2>

          <p>
            Hvis levering er tilgængelig for din adresse, kan levering vælges
            under bestillingen.
          </p>

          <p>
            Den forventede leveringstid vises i forbindelse med bestillingen.
            Leveringstiden er vejledende og kan blandt andet påvirkes af
            travlhed, trafik og vejrforhold.
          </p>

          <p>
            Kunden er ansvarlig for at angive korrekt leveringsadresse og
            kontaktoplysninger.
          </p>
        </section>

        <section className={styles.card}>
          <h2>7. Ændring eller annullering af ordre</h2>

          <p>
            Hvis du opdager en fejl i din bestilling eller ønsker at ændre den,
            skal du kontakte os hurtigst muligt på 40 40 41 83.
          </p>

          <p>
            Muligheden for at ændre eller annullere en ordre afhænger blandt
            andet af, om tilberedningen af ordren allerede er påbegyndt.
          </p>
        </section>

        <section className={styles.card}>
          <h2>8. Fortrydelsesret</h2>

          <p>
            Ved køb af mad og andre varer, som på grund af deres art hurtigt
            forringes eller bliver for gamle, gælder den almindelige 14-dages
            fortrydelsesret som udgangspunkt ikke.
          </p>

          <p>
            En bestilling kan derfor ikke returneres efter levering eller
            afhentning alene på grund af fortrydelse.
          </p>
        </section>

        <section className={styles.card}>
          <h2>9. Fejl og reklamation</h2>

          <p>
            Hvis der er fejl eller mangler ved din ordre, skal du kontakte
            Gastronomia Pizza så hurtigt som muligt på 40 40 41 83.
          </p>

          <p>
            Oplys gerne ordrenummer og en beskrivelse af problemet, så vi kan
            behandle henvendelsen hurtigst muligt.
          </p>
        </section>

        <section className={styles.card}>
          <h2>10. Tilbagebetaling</h2>

          <p>
            Hvis der efter aftale skal ske en hel eller delvis tilbagebetaling,
            vil tilbagebetalingen som udgangspunkt ske via den betalingsmetode,
            der blev anvendt ved købet.
          </p>

          <p>
            Behandlingstiden kan afhænge af betalingsudbyderen og kundens bank.
          </p>
        </section>

        <section className={styles.card}>
          <h2>11. Personoplysninger</h2>

          <p>
            Personoplysninger, som du afgiver i forbindelse med en bestilling,
            anvendes til at behandle og levere din ordre samt til nødvendig
            kundeservice.
          </p>

          <p>
            Yderligere information om behandling af personoplysninger kan findes
            i vores privatlivspolitik.
          </p>
        </section>

        <section className={styles.card}>
          <h2>12. Kontakt</h2>

          <p>
            Hvis du har spørgsmål til en ordre eller disse handelsbetingelser,
            kan du kontakte:
          </p>

          <p>
            <strong>Gastronomia Pizza</strong>
            <br />
            Hillerødvej 38A, 3300 Frederiksværk
            <br />
            Telefon: 40 40 41 83
          </p>
        </section>

        <p className={styles.updated}>Senest opdateret: august 2026</p>
      </div>
    </main>
  );
}
