import nodemailer from "nodemailer";

export async function sendOTPEmail(to: string, otp: string) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!user || !pass) {
    throw new Error("Missing Gmail SMTP env");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from: `"Herbal Store" <${user}>`,
    to,
    subject: "รหัส OTP ของคุณ",
    html: `
      <h2>รหัส OTP ของคุณ</h2>
      <p style="font-size:24px;font-weight:bold;">${otp}</p>
      <p>รหัสนี้จะหมดอายุภายใน 5 นาที</p>
    `,
  });

  console.log("MAIL RESULT:", info.accepted, info.rejected, info.response);

  return true;
}