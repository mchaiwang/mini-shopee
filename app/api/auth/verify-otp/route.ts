import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "data/users.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const user = users.find((u: any) => String(u.email || "").toLowerCase() === email);

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });
    }

    if (!user.otpCode || String(user.otpCode) !== otp) {
      return NextResponse.json({ error: "OTP ไม่ถูกต้อง" }, { status: 400 });
    }

    if (Date.now() > Number(user.otpExpiresAt || 0)) {
      return NextResponse.json({ error: "OTP หมดอายุ" }, { status: 400 });
    }

    user.emailVerified = true;
    user.otpCode = "";
    user.otpPurpose = "";
    user.otpExpiresAt = "";

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}