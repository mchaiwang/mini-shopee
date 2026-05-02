import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOTPEmail(to: string, otp: string) {
  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev', // 🔥 สำคัญ (ห้ามลืม)
      to: to,
      subject: 'รหัส OTP สำหรับรีเซ็ตรหัสผ่าน',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>🔐 รหัส OTP ของคุณ</h2>
          <p>ใช้รหัสด้านล่างเพื่อรีเซ็ตรหัสผ่าน:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>รหัสนี้จะหมดอายุในไม่กี่นาที</p>
        </div>
      `,
    })

    console.log('✅ SEND OTP SUCCESS:', result)
    return { success: true }
  } catch (error) {
    console.error('❌ SEND OTP ERROR:', error)
    return { success: false, error }
  }
}