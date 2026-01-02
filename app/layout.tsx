import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ашот мебель - Фото галерея",
  description: "Фотогалерея мебели с админ-панелью для управления",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
      </body>
    </html>
  );
}
