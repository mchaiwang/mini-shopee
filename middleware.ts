import { NextRequest, NextResponse } from "next/server";

/**
 * จุดศูนย์กลางตั้ง Cache-Control header
 *
 * เป้าหมาย:
 * - API ทุกตัว (โดยเฉพาะ login, logout, auth/me, users, orders, reviews,
 *   creator, finance, commission, withdraw, chat, messages, admin) ต้อง no-store
 *   เพื่อให้ข้อมูล user/order/review/creator/chat สดเสมอ ไม่ต้อง clear cache
 * - HTML pages ก็ no-store เหมือนกัน เพื่อกัน LINE in-app browser cache HTML เก่า
 * - Static assets (รูป, CSS, JS, _next/static, favicon, public/*) ไม่แตะ
 *   ให้ browser cache ตามปกติ เว็บจะเร็วใน LINE / Chrome มือถือ
 *
 * วิธีนี้ครอบคลุม API ทุกตัวในครั้งเดียว ไม่ต้องไปแก้ route ทีละไฟล์
 * และไม่กระทบ logic / JSON response เดิมเลย
 */

// path ที่ต้องไม่แตะ (ให้ cache ได้ตามปกติเพื่อความเร็ว)
function isStaticAsset(pathname: string) {
  if (pathname.startsWith("/_next/static")) return true;
  if (pathname.startsWith("/_next/image")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/images/")) return true;
  if (pathname.startsWith("/img/")) return true;
  if (pathname.startsWith("/uploads/")) return true;
  if (pathname.startsWith("/static/")) return true;
  if (pathname.startsWith("/assets/")) return true;
  if (pathname.startsWith("/fonts/")) return true;

  // นามสกุลไฟล์ของ static assets — รูป / CSS / JS / font / video / audio
  return /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|bmp|css|js|mjs|map|woff|woff2|ttf|otf|eot|mp4|webm|mp3|wav|ogg|pdf|txt|xml|json)$/i.test(
    pathname
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ไม่ทำอะไรกับ static assets ปล่อยให้ cache ปกติ
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // API ทุกตัว + HTML page → no-store
  // ครอบคลุม login, logout, auth/me, users, orders, reviews, creator,
  // commission, withdraw, chat, messages, admin/* และ page ทุกหน้า
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  // กัน CDN / proxy cache
  res.headers.set("CDN-Cache-Control", "no-store");
  res.headers.set("Vercel-CDN-Cache-Control", "no-store");

  return res;
}

// matcher: รันกับ request ทุกตัว ยกเว้น static asset และ _next internal
// รายการ isStaticAsset() ด้านบนเป็น guard ชั้นสองอีกที
export const config = {
  matcher: [
    /*
     * ตรงกับทุก request ยกเว้น:
     * - _next/static (build assets)
     * - _next/image (Next image optimizer)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
