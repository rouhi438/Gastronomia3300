import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

export default async function Footer() {
  const t = await getTranslations("Footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <section className={styles.section}>
            <h2 className={styles.brand}>{STORE.name}</h2>

            <p className={styles.description}>{t("description")}</p>

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
                <span>{t("openingHours")}</span>
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
                    aria-label={t("social.facebookAria")}
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
                    aria-label={t("social.instagramAria")}
                  >
                    <FaInstagram size={20} />
                  </a>
                )}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>{t("shortcuts.title")}</h2>

            <nav
              className={styles.linkList}
              aria-label={t("shortcuts.ariaLabel")}
            >
              <Link href="/menu">{t("shortcuts.menu")}</Link>
              <Link href="/checkout">{t("shortcuts.orderOnline")}</Link>
              <Link href="/profile">{t("shortcuts.profile")}</Link>
              <Link href="/privacy">{t("shortcuts.privacy")}</Link>
              <Link href="/terms">{t("shortcuts.terms")}</Link>
              <Link href="/cookies">{t("shortcuts.cookies")}</Link>
            </nav>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>{t("company.title")}</h2>

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
                <strong>{t("company.cvr")}:</strong>
                <span>{STORE.cvr || t("company.toBeAdded")}</span>
              </p>

              {STORE.experience && (
                <p>
                  <strong>{t("company.experience")}:</strong>
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
                <strong>{t("foodControl.title")}</strong>
                <span>{t("foodControl.description")}</span>
              </div>

              {STORE.smileyReportUrl && (
                <a
                  className={styles.smileyOverlayLink}
                  href={STORE.smileyReportUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("foodControl.ariaLabel")}
                />
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.heading}>{t("findUs.title")}</h2>

            <GoogleMapEmbed mapQuery={mapQuery} />

            <a
              className={styles.directionsLink}
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={17} aria-hidden="true" />
              {t("findUs.directions")}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </section>
        </div>

        <div className={styles.bottomBar}>
          <p>
            {t("copyright", {
              year: currentYear,
              name: STORE.name,
            })}
          </p>

          <p>{t("services")}</p>
        </div>
      </div>
    </footer>
  );
}
