import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastronomia 3300",
  description: " Authentic Italian Pizza ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa">
      <body>{children}</body>
    </html>
  );
}
