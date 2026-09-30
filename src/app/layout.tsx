import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/shell/AppShell";
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
  title: "WALRUS AI Visibility",
  description: "Enterprise SEO, performance, accessibility, and security audits — measured, not guessed.",
  icons: {
    icon: [
      { url: "/Walruslogo.png" },
      { url: "/Walruslogo.png", type: "image/png" },
    ],
    shortcut: "/Walruslogo.png",
    apple: "/Walruslogo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased font-sans font-funnel`}
    >
      <body className="min-h-full flex flex-col bg-slate-50/70 text-slate-900 font-sans">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
