import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DraftRadar // Fantasy Baseball Snake Draft Assistant",
  description: "Next-gen fantasy baseball snake draft simulator with real-time position pressure, category fit, and return probabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body>{children}</body>
    </html>
  );
}
