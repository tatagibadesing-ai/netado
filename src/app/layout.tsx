import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { BetProvider } from "@/context/BetContext";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";

const figtree = Figtree({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Netano - Apostas Esportivas",
  description: "A sua casa de apostas esportivas",
  icons: {
    icon: "/netadologo.webp",
  },
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
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex flex-1 relative">
              <Sidebar />
              <div className="flex-1 min-w-0 flex flex-col">
                {children}
              </div>
            </div>
          </div>
        </BetProvider>
      </body>
    </html>
  );
}
