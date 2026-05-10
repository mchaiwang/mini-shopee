import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteNavbar from "@/app/components/site-navbar";
import { ToastProvider } from "@/app/components/ToastProvider";

export const metadata: Metadata = {
  title: "จำรัสฟาร์ม - Herbal Store",
  description: "ร้านสมุนไพรออนไลน์ รีวิวจริงจากผู้ใช้",

  // กัน LINE in-app browser และ Chrome มือถือ cache HTML เก่า
  // ไม่กระทบ static assets (รูป/CSS/JS) เพราะ middleware เว้นไว้แล้ว
  other: {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  },
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
      <head>
        {/* meta tag ในระดับ HTML สำหรับ LINE in-app browser ที่บางทีไม่อ่าน HTTP header
            แต่อ่าน meta tag — ทำให้ HTML ไม่ถูก cache เก่า */}
        <meta
          httpEquiv="Cache-Control"
          content="no-store, no-cache, must-revalidate, max-age=0"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>

      <body>
        <ToastProvider>
          <SiteNavbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}