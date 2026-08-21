import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <CartProvider>
              <CartUIProvider>{children}</CartUIProvider>
            </CartProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
