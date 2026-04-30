import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();

    // ⚠️ ตอนนี้ยังไม่เขียนลง users.json เพราะ Vercel เขียนไม่ได้
    // เอาไว้หลังบ้านค่อยเปลี่ยนเป็น DB จริง

    return NextResponse.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ (mock)",
    });
  } catch (err) {
    return NextResponse.json({ error: "reset failed" }, { status: 500 });
  }
}