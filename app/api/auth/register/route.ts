// app/api/auth/register/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { sendOTPEmail } from "@/lib/mailer";

const filePath = path.join(process.cwd(), "data/users.json");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
    }

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const exists = users.find(
      (u: any) => String(u.email).toLowerCase() === email
    );

    if (exists) {
      return NextResponse.json({ error: "Email already used" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    console.log("REGISTER OTP:", email, otp);

    const newUser = {
      id: "user-" + Date.now(),
      name,
      email,
      passwordHash,
      role: "customer",
      createdAt: new Date().toISOString(),
      emailVerified: false,
      otpCode: otp,
      otpPurpose: "verify",
      otpExpiresAt: Date.now() + 5 * 60 * 1000,
    };

    users.push(newUser);
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    // 🔥 ส่ง email จริง
    console.log("REGISTER SEND EMAIL START:", email);

await sendOTPEmail(email, otp);

console.log("REGISTER SEND EMAIL SUCCESS:", email);
    return NextResponse.json({
      success: true,
      needVerify: true,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}