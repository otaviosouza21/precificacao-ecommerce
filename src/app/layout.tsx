import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import MainHeader from "@/components/Ui/Header/MainHeader";
import { ToastContainer } from "react-toastify";

const poppins = Poppins({
  variable: "--font-poppins",
  style: "normal",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Precificação Ecommerce",
  description:
    "Aplicação para automatizar precificação do ecommerce com a api tiny",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable}  antialiased flex `}>
        <MainHeader />
        <div className="ml-15 w-full">{children}</div>
        <ToastContainer />
      </body>
    </html>
  );
}
