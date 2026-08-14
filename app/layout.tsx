import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { CartProvider } from "@/context/CartContext";
import { CartUIProvider } from "@/context/CartUIContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastronomia 3300",
  description: "Bestil pizza online hos Gastronomia 3300.",
  appleWebApp: {
    capable: true,
    title: "Gastronomia 3300",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
