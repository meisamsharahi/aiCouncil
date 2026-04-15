import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "AI Council",
  description: "Multi-LLM meeting platform for AI persona debates",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navigation />
        <main className="ml-0 md:ml-56 pt-12 md:pt-0 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
