// app/api/auth/verify-otp/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data/users.json");

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const user = users.find(
      (u: any) => String(u.email).toLowerCase() === String(email).toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    if (!user.otpCode || user.otpCode !== otp) {
      return NextResponse.json({ error: "OTP ไม่ถูกต้อง" }, { status: 400 });
    }

    if (Date.now() > Number(user.otpExpiresAt)) {
      return NextResponse.json({ error: "OTP หมดอายุ" }, { status: 400 });
    }

    // ✅ verify ผ่าน
    user.emailVerified = true;
    user.otpCode = "";
    user.otpExpiresAt = "";

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}