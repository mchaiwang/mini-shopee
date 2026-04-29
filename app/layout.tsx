import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteNavbar from "@/app/components/site-navbar";

export const metadata: Metadata = {
  title: "จำรัสฟาร์ม - Herbal Store",
  description: "ร้านสมุนไพรออนไลน์ รีวิวจริงจากผู้ใช้",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ee4d2d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <SiteNavbar />
        {children}
      </body>
    </html>
  );
}
