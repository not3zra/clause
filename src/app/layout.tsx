import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

const display = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Clause | Grammar Missions",
  description: "A grammar escape-room platform for Grades 6-9.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${display.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
