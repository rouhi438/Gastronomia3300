import Link from "next/link";
import styles from "../terms/terms.module.css";

export const metadata = {
  title: "Cookiepolitik | Gastronomia Pizza",
  description:
    "Information om cookies og browserlagring på Gastronomia Pizzas hjemmeside.",
};

export default function CookiesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Gastronomia Pizza</p>

          <h1>Cookiepolitik</h1>

          <p className={styles.intro}>
            Her kan du læse, hvordan Gastronomia Pizza anvender cookies,
            browserlagring og eksterne tjenester på hjemmesiden.
          </p>
        </header>

        <section className={styles.card}>
          <h2>1. Hvad er cookies og browserlagring?</h2>

          <p>
            Cookies er små tekstfiler, som en hjemmeside kan gemme i din
            browser. De kan blandt andet bruges til login, sikkerhed og til at
            huske dine valg.
          </p>

          <p>
            Hjemmesiden anvender også local storage. Det fungerer på samme måde
            som lokal lagring i browseren, men oplysningerne sendes ikke
            automatisk med hver internetforespørgsel.
          </p>
        </section>

        <section className={styles.card}>
          <h2>2. Nødvendige cookies</h2>

          <p>
            Vi anvender Supabase til brugerlogin og sessionshåndtering. Supabase
            kan gemme nødvendige cookies eller sessionstokens i browseren for at
            holde dig logget ind og beskytte din konto.
          </p>

          <p>
            Disse oplysninger er nødvendige, hvis du vælger at logge ind. De
            slettes eller udløber normalt, når sessionen udløber, du logger ud,
            eller browserens lagring ryddes.
          </p>
        </section>

        <section className={styles.card}>
          <h2>3. Lokal lagring på hjemmesiden</h2>

          <p>
            <strong>cart</strong>
            <br />
            Indeholder indholdet af din indkøbskurv samt valg som
            leveringsmetode og ønsket tidspunkt. Det gør det muligt at bevare
            kurven, hvis siden genindlæses.
          </p>

          <p>
            <strong>checkout-customer</strong>
            <br />
            Anvendes midlertidigt til at overføre relevante kundeoplysninger til
            checkout-siden. Oplysningen fjernes igen af checkout-flowet.
          </p>

          <p>
            <strong>checkout-customer-details</strong>
            <br />
            Kan indeholde kontakt- og leveringsoplysninger, som du har indtastet
            under bestillingen, så formularen kan gendannes eller udfyldes
            lettere.
          </p>

          <p>
            <strong>checkout-order-note</strong>
            <br />
            Indeholder en eventuel kommentar, som du har skrevet til ordren.
          </p>

          <p>
            Checkout-oplysningerne fjernes efter gennemført betalingsflow.
            Browserlagring kan også slettes manuelt via browserens
            indstillinger.
          </p>

          <p>
            Hvis du bruger en delt computer eller telefon, anbefaler vi, at du
            rydder browserdata efter bestillingen.
          </p>
        </section>

        <section className={styles.card}>
          <h2>4. Betaling via Nexi/Nets</h2>

          <p>
            Når du vælger onlinebetaling, bliver du sendt til en betalingsside,
            som drives af Nexi/Nets.
          </p>

          <p>
            Betalingsudbyderen kan anvende nødvendige cookies og teknisk lagring
            til betaling, sikkerhed, forebyggelse af misbrug og eventuel
            godkendelse af betalingskortet.
          </p>

          <p>
            Disse cookies og oplysninger administreres af Nexi/Nets efter
            betalingsudbyderens egne vilkår og privatlivspolitik.
          </p>
        </section>

        <section className={styles.card}>
          <h2>5. Login med Google eller Facebook</h2>

          <p>
            Google eller Facebook kontaktes først i forbindelse med login, hvis
            du selv vælger den pågældende loginmetode.
          </p>

          <p>
            Loginudbyderen kan i den forbindelse anvende egne cookies og
            sikkerhedsteknologier. Behandlingen sker efter udbyderens egne
            vilkår og privatlivspolitik.
          </p>
        </section>

        <section className={styles.card}>
          <h2>6. Google Maps</h2>

          <p>
            Kortet i hjemmesidens footer indlæses ikke automatisk. Google Maps
            kontaktes først, hvis du aktivt vælger at vise kortet.
          </p>

          <p>
            Når kortet aktiveres, kan Google modtage tekniske oplysninger som
            IP-adresse, browseroplysninger og tidspunkt samt anvende egne
            cookies eller andre lagringsteknologier.
          </p>

          <p>
            Hvis du ikke ønsker denne behandling, kan du undlade at aktivere
            kortet og i stedet bruge den almindelige adresse eller
            rutevejledningslinket.
          </p>
        </section>

        <section className={styles.card}>
          <h2>7. Statistik og markedsføring</h2>

          <p>
            Hjemmesiden anvender på nuværende tidspunkt ikke cookies til
            besøgsstatistik, personaliseret annoncering eller
            markedsføringssporing.
          </p>

          <p>
            Hvis sådanne tjenester tilføjes senere, skal cookiepolitikken og den
            tekniske samtykkeløsning opdateres, inden tjenesterne aktiveres.
          </p>
        </section>

        <section className={styles.card}>
          <h2>8. Sådan sletter du lagrede oplysninger</h2>

          <p>
            Du kan slette cookies og local storage via browserens indstillinger.
            Fremgangsmåden afhænger af den browser og enhed, du bruger.
          </p>

          <p>
            Hvis nødvendige loginoplysninger slettes, kan du blive logget ud.
            Hvis kurvens lagring slettes, bliver de gemte varer og valg fjernet.
          </p>
        </section>

        <section className={styles.card}>
          <h2>9. Kontakt og yderligere information</h2>

          <p>
            Hvis du har spørgsmål om cookies eller behandling af
            personoplysninger, kan du kontakte Gastronomia Pizza på telefon 40
            40 41 83.
          </p>

          <p>
            Du kan læse mere om vores behandling af personoplysninger i vores{" "}
            <Link href="/privacy">privatlivspolitik</Link>.
          </p>
        </section>

        <section className={styles.card}>
          <h2>10. Ændringer</h2>

          <p>
            Cookiepolitikken opdateres, hvis hjemmesidens lagringsteknologier
            eller eksterne tjenester ændres.
          </p>
        </section>

        <p className={styles.updated}>Senest opdateret: august 2026</p>
      </div>
    </main>
  );
}
