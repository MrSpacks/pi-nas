import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAS — доступ к файлам",
  description: "Удалённый доступ к домашнему NAS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
