import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EquipTrack — облік обладнання",
  description: "Внутрішня система обліку обладнання освітнього закладу.",
  applicationName: "EquipTrack",
  manifest: "/site.webmanifest",
  themeColor: "#172127",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
