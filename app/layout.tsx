import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NWIS — Nearby Wells Intelligence System",
  description: "Evidence-linked drilling intelligence for SIH26121.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
