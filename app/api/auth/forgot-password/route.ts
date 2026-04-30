import { NextResponse } from "next/server";
import { Resend } from "resend";
import { setOTP } from "@/lib/otpStore";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // เก็บ OTP ใน memory
    setOTP(email, otp);

    // ส่ง email
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: "OTP Reset Password",
      html: `
        <h2>รหัส OTP ของคุณ</h2>
        <h1>${otp}</h1>
        <p>หมดอายุใน 5 นาที</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return NextResponse.json({ error: "send otp failed" }, { status: 500 });
  }
}