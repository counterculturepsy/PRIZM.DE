import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PRIZM.DEV", template: "%s · PRIZM.DEV" },
  description: "Evidence-led prospect intelligence for developers and digital agencies.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
