import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalareach — Email Outreach Sekolah",
  description: "Tool scraping data sekolah Kemdikbud + email blast",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="h-screen bg-slate-50 text-slate-900 flex overflow-hidden">
        <NavigationProgress />
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </body>
    </html>
  );
}
