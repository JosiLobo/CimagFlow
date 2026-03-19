import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "CimagFlow - Assinatura Digital de Documentos",
  description: "Sistema profissional de gestão e assinatura digital de documentos",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "CimagFlow - Assinatura Digital",
    description: "Sistema profissional de gestão e assinatura digital de documentos",
    images: ["/og-image.png"],
  },
  ...(process.env.NEXTAUTH_URL && {
    metadataBase: new URL(process.env.NEXTAUTH_URL),
  }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <Script src="https://apps.abacus.ai/chatllm/appllm-lib.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
