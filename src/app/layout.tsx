import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { BetProvider } from "@/context/BetContext";

const figtree = Figtree({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Netano - Apostas Esportivas",
  description: "A sua casa de apostas esportivas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${figtree.className} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#080808] text-slate-100 selection:bg-[#FF3C00] selection:text-white">
        <BetProvider>
          {children}
        </BetProvider>
      </body>
    </html>
  );
}
