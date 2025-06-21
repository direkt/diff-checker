import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ErrorProvider } from "@/components/ErrorToast";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dremio Query Diff Checker",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        <ErrorProvider>
          {children}
        </ErrorProvider>
      </body>
    </html>
  );
}
