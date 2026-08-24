"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import styles from "./Footer.module.css";

type GoogleMapEmbedProps = {
  mapQuery: string;
};

export default function GoogleMapEmbed({ mapQuery }: GoogleMapEmbedProps) {
  const t = useTranslations("Footer.map");
  const [mapAllowed, setMapAllowed] = useState(false);

  if (mapAllowed) {
    return (
      <div className={styles.mapWrapper}>
        <iframe
          title={t("iframeTitle")}
          src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={`${styles.mapWrapper} ${styles.mapPlaceholder}`}>
      <MapPin size={30} aria-hidden="true" />

      <strong>Google Maps</strong>

      <p>{t("privacyDescription")}</p>

      <button type="button" onClick={() => setMapAllowed(true)}>
        {t("showMap")}
      </button>
    </div>
  );
}
