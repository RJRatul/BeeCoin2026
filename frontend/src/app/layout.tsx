import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PriceProvider } from "@/contexts/PriceContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BeeCoin - Meme Coins Trading Platform",
  description:
    "Discover and trade the most exciting meme coins. Join the community-driven revolution in cryptocurrency trading with BeeCoin.",
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
            <Toaster position="top-right" />
          </PriceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}