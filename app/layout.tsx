import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Capstone",
  description: "AI-powered project assistant — for students, makers, and anyone building something new",
  icons: [
    { rel: "icon", url: "/logo-icon.svg", type: "image/svg+xml" },
    { rel: "icon", url: "/logo-icon.png", type: "image/png" },
    { rel: "apple-touch-icon", url: "/logo-icon-128.png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
