import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Analyst Dashboard - Financial Analyst Insights",
  description: "Search and explore financial analysts, their predictions, and earnings call commentary with AI-powered insights.",
  applicationName: "Analyst Dashboard",
  openGraph: {
    title: "Analyst Dashboard",
    description: "Search and explore financial analysts, their predictions, and earnings call commentary with AI-powered insights.",
    siteName: "Analyst Dashboard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Analyst Dashboard",
    description: "Search and explore financial analysts, their predictions, and earnings call commentary with AI-powered insights.",
  },
  appleWebApp: {
    title: "Analyst Dashboard",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
