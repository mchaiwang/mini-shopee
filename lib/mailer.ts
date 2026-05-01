import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(email: string, otp: string) {
  console.log("📨 sending OTP to:", email);

  const res = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "รหัส OTP ของคุณ",
    html: `
      <h2>รหัส OTP</h2>
      <h1 style="color:red">${otp}</h1>
      <p>หมดอายุ 5 นาที</p>
    `,
  });

  console.log("RESEND RESULT:", res);
}