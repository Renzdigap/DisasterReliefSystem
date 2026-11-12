import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRRMS — Disaster Relief & Resource Management System (City of Batac, Ilocos Norte)",
  description:
    "Institutional Information Management Framework & Multi-Portal System for City of Batac CDRRMO powered by Java JDBC & Supabase PostgreSQL 15 (3NF).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
