import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // 🔥 ลบ cookie auth
  res.cookies.set("auth", "", {
    path: "/",
    expires: new Date(0),
  });

  // ถ้ามี admin cookie ก็ลบทิ้งด้วย
  res.cookies.set("admin", "", {
    path: "/",
    expires: new Date(0),
  });

  return res;
}