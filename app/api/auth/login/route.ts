import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "data/users.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 400 });
    }

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const user = users.find(
      (u: any) => String(u.email || "").trim().toLowerCase() === email
    );

    if (!user) {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 400 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "บัญชีนี้ยังไม่มีรหัสผ่านในระบบ" },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 400 });
    }

    // เช็ค OTP หลังจากรหัสผ่านถูกต้องแล้วเท่านั้น
    if (user.emailVerified === false) {
      return NextResponse.json(
        { error: "กรุณายืนยัน OTP ทางอีเมลก่อน" },
        { status: 400 }
      );
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set(
      "auth",
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        creatorEnabled: user.creatorEnabled || false,
        creatorStatus: user.creatorStatus || "none",
        permissions: user.permissions || {},
      }),
      {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    res.cookies.set("auth_role", user.role || "customer", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}