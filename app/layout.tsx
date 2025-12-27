import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartwise - Smart Recipe & Shopping List Manager",
  description: "Save recipes, organize ingredients, and create smart shopping lists categorized by supermarket aisle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
