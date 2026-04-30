import { NextResponse } from "next/server";
import { getOTP, clearOTP } from "@/lib/otpStore";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const realOTP = getOTP(email);

    if (!realOTP || realOTP !== otp) {
      return NextResponse.json({ error: "OTP ไม่ถูกต้อง" }, { status: 400 });
    }

    // ผ่านแล้วลบ OTP
    clearOTP(email);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}