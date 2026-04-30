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

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 400 });
    }

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const user = users.find((u: any) => u.email === body.email);

    if (!user) {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 400 });
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
if (!user.emailVerified) {
  return NextResponse.json(
    { error: "กรุณายืนยัน OTP ทางอีเมลก่อน" },
    { status: 400 }
  );
}
    if (!ok) {
      return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 400 });
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
