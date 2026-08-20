"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import styles from "./Footer.module.css";

type GoogleMapEmbedProps = {
  mapQuery: string;
};

export default function GoogleMapEmbed({ mapQuery }: GoogleMapEmbedProps) {
  const [mapAllowed, setMapAllowed] = useState(false);

  if (mapAllowed) {
    return (
      <div className={styles.mapWrapper}>
        <iframe
          title="Gastronomia Pizza på Google Maps"
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

      <p>
        Kortet leveres af Google. Når du viser kortet, kan Google modtage
        tekniske oplysninger og anvende cookies.
      </p>

      <button type="button" onClick={() => setMapAllowed(true)}>
        Vis kort
      </button>
    </div>
  );
}
