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

import { NotificationProvider } from "@/components/providers/notification-provider";

export const metadata: Metadata = {
  title: "Dwellioo | Property Management Simplified",
  description: "Dwellioo is a modern property management system for managers and residents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark bg-background text-foreground`}
    >
      <body className="min-h-full flex flex-col">
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
