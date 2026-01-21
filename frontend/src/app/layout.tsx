import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marconi Elearn | Modern Learning Management",
  description:
    "A modern Learning Management System for lecturers to manage courses, assignments, and provide AI-powered feedback on student code submissions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="noise" />
        {children}
      </body>
    </html>
  );
}
