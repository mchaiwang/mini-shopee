import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailOtp(email: string, otp: string, purpose: "verify" | "reset") {
  const subject =
    purpose === "reset"
      ? "รหัส OTP สำหรับรีเซตรหัสผ่าน"
      : "รหัส OTP สำหรับยืนยันบัญชี";

  const title =
    purpose === "reset"
      ? "รีเซตรหัสผ่าน"
      : "ยืนยันบัญชีของคุณ";

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Mini Shopee <onboarding@resend.dev>",
    to: email,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;padding:24px">
        <h2>${title}</h2>
        <p>รหัส OTP ของคุณคือ</p>
        <div style="font-size:36px;font-weight:900;color:#ee4d2d;letter-spacing:6px">
          ${otp}
        </div>
        <p>รหัสนี้หมดอายุใน 5 นาที</p>
      </div>
    `,
  });
}