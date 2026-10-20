import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Montserrat } from "next/font/google";
import "./globals.css";

const display = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni" });
const sans = Montserrat({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ilo",
  description: "Private counselling on your campus.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fcf9fa" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${display.variable} ${sans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

