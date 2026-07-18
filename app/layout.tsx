import type { Metadata } from "next";
import { Providers } from "./providers";
import { CartProvider } from "@/context/CartContext";
import { CartUIProvider } from "@/context/CartUIContext";
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
    <html lang="da" suppressHydrationWarning>
      <body>
        <Providers>
          <CartProvider>
            <CartUIProvider>{children}</CartUIProvider>
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
