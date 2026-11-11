import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kitty Tinder",
  description: "Find your perfect ragdoll cat",
  // Private tool: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fdf6ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}>
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}
