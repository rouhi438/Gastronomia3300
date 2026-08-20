import Link from "next/link";
import {
  Building2,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaRegSmile,
  FaRegLaughWink,
} from "react-icons/fa";
import GoogleMapEmbed from "./GoogleMapEmbed";
import styles from "./Footer.module.css";

const STORE = {
  name: "Gastronomia Pizza",
  address: "Hillerødvej 38A, 3300 Frederiksværk",
  phone: "4040 4183",
  email: "",
  cvr: "40954627",
  experience: "",
  facebookUrl: "",
  instagramUrl: "",
  smileyReportUrl: "https://findsmiley.dk/931986",
};

const mapQuery = encodeURIComponent(STORE.address);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <section className={styles.section}>
            <h2 className={styles.brand}>{STORE.name}</h2>

            <p className={styles.description}>
              Brændefyret stenovnspizza og gode råvarer i hjertet af
              Frederiksværk.
            </p>

            <div className={styles.contactList}>
              <a href={`tel:${STORE.phone.replace(/\s/g, "")}`}>
                <Phone size={17} aria-hidden="true" />
                <span>{STORE.phone}</span>
              </a>

              {STORE.email && (
                <a href={`mailto:${STORE.email}`}>
                  <Mail size={17} aria-hidden="true" />
                  <span>{STORE.email}</span>
                </a>
              )}

              <p>
                <Clock3 size={17} aria-hidden="true" />
                <span>Alle dage kl. 15.00–21.00</span>
              </p>
            </div>

            {(STORE.facebookUrl || STORE.instagramUrl) && (
              <div className={styles.socialLinks}>
                {STORE.facebookUrl && (
                  <a
                    className={styles.facebookLink}
                    href={STORE.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Følg Gastronomia Pizza på Facebook"
                  >
                    <FaFacebookF size={18} />
                  </a>
                )}

                {STORE.instagramUrl && (
                  <a
                    className={styles.instagramLink}
                    href={STORE.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Følg Gastronomia Pizza på Instagram"
                  >
                    <FaInstagram size={20} />
                  </a>
                )}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Genveje</h2>

            <nav className={styles.linkList} aria-label="Genveje">
              <Link href="/menu">Menu</Link>
              <Link href="/checkout">Bestil online</Link>
              <Link href="/profile">Min profil</Link>
              <Link href="/privacy">Privatlivspolitik</Link>
              <Link href="/terms">Handelsbetingelser</Link>
              <Link href="/cookies">Cookiepolitik</Link>
            </nav>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Virksomhedsoplysninger</h2>

            <div className={styles.companyInfo}>
              <p>
                <Building2 size={17} aria-hidden="true" />
                <span>{STORE.name}</span>
              </p>

              <p>
                <MapPin size={17} aria-hidden="true" />
                <span>{STORE.address}</span>
              </p>

              <p>
                <strong>CVR:</strong>
                <span>{STORE.cvr || "Tilføjes"}</span>
              </p>

              {STORE.experience && (
                <p>
                  <strong>Erfaring:</strong>
                  <span>{STORE.experience}</span>
                </p>
              )}
            </div>

            <div className={styles.smileyCard}>
              <div className={styles.smileyIcon} aria-hidden="true">
                <FaRegSmile className={styles.smileNormal} />
                <FaRegLaughWink className={styles.smileHover} />
              </div>

              <div className={styles.smileyText}>
                <strong>Fødevarekontrol</strong>

                <span>
                  Se Gastronomia Pizzas kontrolrapport hos Fødevarestyrelsen
                </span>
              </div>

              {STORE.smileyReportUrl && (
                <a
                  className={styles.smileyOverlayLink}
                  href={STORE.smileyReportUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Se Gastronomia Pizzas kontrolrapport hos Fødevarestyrelsen"
                />
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>Find os</h2>
            <GoogleMapEmbed mapQuery={mapQuery} />
            <a
              className={styles.directionsLink}
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={17} aria-hidden="true" />
              Få rutevejledning
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </section>
        </div>

        <div className={styles.bottomBar}>
          <p>
            © {currentYear} {STORE.name}. Alle rettigheder forbeholdes.
          </p>

          <p>Levering · Afhentning · MobilePay . Betalingskort</p>
        </div>
      </div>
    </footer>
  );
}
