import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clause | Grammar Missions",
  description: "A grammar escape-room platform for Grades 6–9.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
