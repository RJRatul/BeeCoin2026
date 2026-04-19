import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PriceProvider } from "@/contexts/PriceContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cryptax - Live Crypto Trading Platform",
  description:
    "Trade live cryptocurrencies in real time. Join thousands of traders on Cryptax — the fast, reliable platform for Bitcoin, Ethereum, Solana and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <PriceProvider>
            {children}
            <Toaster
              position="top-right"
              containerStyle={{ zIndex: 99999 }}
              toastOptions={{
                duration: 6000,
                style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
              }}
            />
          </PriceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}