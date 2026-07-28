/// <reference types="google.maps" />
"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

import styles from "./AddressAutocomplete.module.css";

const GOOGLE_MAPS_SCRIPT_ID = "gastronomia-google-maps-script";

const GOOGLE_MAPS_API_URL = "https://maps.googleapis.com/maps/api/js";

export interface DeliveryAddress {
  addressLine1: string;
  postalCode: string;
  city: string;
  floorDoor: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
}

interface AddressAutocompleteProps {
  value: DeliveryAddress;
  onChange: (address: DeliveryAddress) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

interface ParsedAddress {
  addressLine1: string;
  postalCode: string;
  city: string;
}

declare global {
  interface Window {
    google?: typeof google;
    __gastronomiaGoogleMapsPromise?: Promise<void>;
  }
}

function isGooglePlacesReady(): boolean {
  return Boolean(typeof window !== "undefined" && window.google?.maps?.places);
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps kan kun indlæses i browseren."),
    );
  }

  if (isGooglePlacesReady()) {
    return Promise.resolve();
  }

  if (window.__gastronomiaGoogleMapsPromise) {
    return window.__gastronomiaGoogleMapsPromise;
  }

  window.__gastronomiaGoogleMapsPromise = new Promise<void>(
    (resolve, reject) => {
      const existingScript = document.getElementById(
        GOOGLE_MAPS_SCRIPT_ID,
      ) as HTMLScriptElement | null;

      const handleLoadedScript = () => {
        if (isGooglePlacesReady()) {
          resolve();
          return;
        }

        reject(
          new Error("Google Places blev indlæst uden Places-biblioteket."),
        );
      };

      if (existingScript) {
        if (isGooglePlacesReady()) {
          resolve();
          return;
        }

        existingScript.addEventListener("load", handleLoadedScript, {
          once: true,
        });

        existingScript.addEventListener(
          "error",
          () => {
            reject(new Error("Google Maps-scriptet kunne ikke indlæses."));
          },
          {
            once: true,
          },
        );

        return;
      }

      const script = document.createElement("script");

      const params = new URLSearchParams({
        key: apiKey,
        libraries: "places",
        language: "da",
        region: "DK",
        v: "weekly",
      });

      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.src = `${GOOGLE_MAPS_API_URL}?${params.toString()}`;
      script.async = true;
      script.defer = true;

      script.addEventListener("load", handleLoadedScript, {
        once: true,
      });

      script.addEventListener(
        "error",
        () => {
          window.__gastronomiaGoogleMapsPromise = undefined;

          reject(new Error("Google Maps-scriptet kunne ikke indlæses."));
        },
        {
          once: true,
        },
      );

      document.head.appendChild(script);
    },
  );

  return window.__gastronomiaGoogleMapsPromise;
}

function getAddressComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  acceptedTypes: string[],
): string {
  if (!components) {
    return "";
  }

  const component = components.find((item) =>
    acceptedTypes.some((type) => item.types.includes(type)),
  );

  return component?.long_name?.trim() ?? "";
}

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): ParsedAddress {
  const streetName = getAddressComponent(components, ["route"]);

  const streetNumber = getAddressComponent(components, ["street_number"]);

  const postalCode = getAddressComponent(components, ["postal_code"]);

  const city = getAddressComponent(components, [
    "postal_town",
    "locality",
    "sublocality",
    "administrative_area_level_2",
  ]);

  const addressLine1 = [streetName, streetNumber]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    addressLine1,
    postalCode,
    city,
  };
}

function clearSelectedPlace(
  currentValue: DeliveryAddress,
  typedAddress: string,
): DeliveryAddress {
  return {
    ...currentValue,
    addressLine1: typedAddress,
    postalCode: "",
    city: "",
    placeId: "",
    latitude: null,
    longitude: null,
    formattedAddress: "",
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const placeListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const latestValueRef = useRef<DeliveryAddress>(value);

  const onChangeRef = useRef(onChange);

  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handlePlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current;

    if (!autocomplete) {
      return;
    }

    const place = autocomplete.getPlace();

    const location = place.geometry?.location;

    if (!place.place_id || !location || !place.address_components) {
      setLoadError("Vælg en gyldig adresse fra listen.");

      return;
    }

    const parsedAddress = parseAddressComponents(place.address_components);

    if (
      !parsedAddress.addressLine1 ||
      !parsedAddress.postalCode ||
      !parsedAddress.city
    ) {
      setLoadError("Adressen mangler vej, postnummer eller by.");

      return;
    }

    setLoadError(null);

    onChangeRef.current({
      ...latestValueRef.current,
      addressLine1: parsedAddress.addressLine1,
      postalCode: parsedAddress.postalCode,
      city: parsedAddress.city,
      placeId: place.place_id,
      latitude: location.lat(),
      longitude: location.lng(),
      formattedAddress:
        place.formatted_address ??
        [
          parsedAddress.addressLine1,
          parsedAddress.postalCode,
          parsedAddress.city,
        ]
          .filter(Boolean)
          .join(", "),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeAutocomplete = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        if (!cancelled) {
          setIsLoading(false);
          setLoadError("Google Maps API-nøglen mangler.");
        }

        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        await loadGoogleMapsScript(apiKey);

        if (cancelled || !inputRef.current || autocompleteRef.current) {
          return;
        }

        const autocomplete = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: {
              country: "dk",
            },
            fields: [
              "address_components",
              "formatted_address",
              "geometry",
              "place_id",
            ],
            types: ["address"],
          },
        );

        autocompleteRef.current = autocomplete;

        placeListenerRef.current = autocomplete.addListener(
          "place_changed",
          handlePlaceChanged,
        );

        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (caughtError) {
        console.error("Google Places initialization failed:", caughtError);

        if (!cancelled) {
          setIsLoading(false);
          setLoadError("Adressesøgningen kunne ikke indlæses.");
        }
      }
    };

    void initializeAutocomplete();

    return () => {
      cancelled = true;

      placeListenerRef.current?.remove();
      placeListenerRef.current = null;

      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);

        autocompleteRef.current = null;
      }
    };
  }, [handlePlaceChanged]);
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const typedAddress = event.target.value;

    setLoadError(null);

    onChangeRef.current(
      clearSelectedPlace(latestValueRef.current, typedAddress),
    );
  };

  const visibleError = error ?? loadError;

  const hasSelectedAddress = Boolean(
    value.placeId &&
    value.latitude !== null &&
    value.longitude !== null &&
    value.postalCode &&
    value.city,
  );

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="delivery-address">
        Leveringsadresse
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          id="delivery-address"
          name="deliveryAddress"
          type="text"
          autoComplete="street-address"
          inputMode="text"
          value={value.addressLine1}
          placeholder={
            isLoading
              ? "Indlæser adressesøgning..."
              : "Søg efter din adresse..."
          }
          disabled={disabled || isLoading}
          required={required}
          aria-invalid={Boolean(visibleError)}
          aria-describedby={
            visibleError ? "delivery-address-error" : "delivery-address-helper"
          }
          className={[
            styles.input,
            visibleError ? styles.inputError : "",
            hasSelectedAddress ? styles.inputValid : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onChange={handleInputChange}
        />

        {isLoading ? (
          <span className={styles.spinner} aria-label="Indlæser" />
        ) : null}

        {!isLoading && hasSelectedAddress ? (
          <span className={styles.validIcon} aria-hidden="true">
            ✓
          </span>
        ) : null}
      </div>

      {hasSelectedAddress ? (
        <div className={styles.selectedAddress}>
          <div className={styles.selectedIcon}>✓</div>

          <div className={styles.selectedText}>
            <strong>{value.addressLine1}</strong>

            <span>
              {value.postalCode} {value.city}
            </span>
          </div>
        </div>
      ) : null}

      {visibleError ? (
        <p id="delivery-address-error" className={styles.error} role="alert">
          {visibleError}
        </p>
      ) : (
        <p id="delivery-address-helper" className={styles.helper}>
          Vælg adressen fra Googles liste, så postnummer, by og koordinater
          bliver registreret korrekt.
        </p>
      )}
    </div>
  );
}
