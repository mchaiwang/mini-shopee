import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "data/users.json");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const user = users.find((u: any) => String(u.email || "").toLowerCase() === email);

    if (!user) {
      return NextResponse.json({ error: "ไม่พบอีเมลนี้ในระบบ" }, { status: 400 });
    }

    const otp = generateOTP();

    user.otpCode = otp;
    user.otpPurpose = "reset";
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000;

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    console.log("RESET OTP:", otp);

    return NextResponse.json({
      success: true,
      devOtp: otp,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}