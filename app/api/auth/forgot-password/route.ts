import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sendOTPEmail } from "@/lib/mailer";

const filePath = path.join(process.cwd(), "data/users.json");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const user = users.find(
      (u: any) => String(u.email).toLowerCase() === String(email).toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });
    }

    const otp = generateOTP();

    user.otpCode = otp;
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000;

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    // 🔥 จุดสำคัญที่สุด
    await sendOTPEmail(email, otp);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("OTP ERROR:", err);
    return NextResponse.json({ error: "send otp failed" }, { status: 500 });
  }
}