// app/api/auth/reset-password/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const filePath = path.join(process.cwd(), "data/users.json");

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

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

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.otpCode = "";
    user.otpExpiresAt = "";

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "reset failed" }, { status: 500 });
  }
}