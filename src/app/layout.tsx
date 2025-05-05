import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import MainHeader from "@/components/Ui/Header/MainHeader";



const poppins = Poppins({
  variable: "--font-poppins",
 style: "normal",
 subsets: ["latin"],
 weight: ["400","500", "600", "700", "800"] 
});

export const metadata: Metadata = {
  title: "Precificação Ecommerce",
  description: "Aplicação para automatizar precificação do ecommerce com a api tiny",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${poppins.variable}  antialiased `}
      >
        <MainHeader />
        {children}
      </body>
    </html>
  );
}
