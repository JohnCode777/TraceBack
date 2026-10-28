import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TraceBack", template: "%s · TraceBack" },
  description: "Bug reproduction and investigation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
