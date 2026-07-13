"use client";
import Image from "next/image";
import { MenuGrid } from "@/components/MenuGrid";
export default function Home() {
  return (
    <main>
      <Image
        src="/images/logo.png"
        alt="Gastronomia 3300 logo"
        width={320}
        height={300}
        priority
      />
      <p
        style={{
          marginTop: "1.5rem",
          color: "#333",
          fontSize: "1.2rem",
          borderTop: "2px solid #009246",
          paddingTop: "1rem",
        }}
      >
        Authentic Italian Pizza
      </p>
      <MenuGrid />
    </main>
  );
}
