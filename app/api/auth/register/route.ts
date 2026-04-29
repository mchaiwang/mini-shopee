import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const filePath = path.join(process.cwd(), "data/users.json");

export async function POST(req: Request) {
  const body = await req.json();

  const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const exists = users.find((u: any) => u.email === body.email);
  if (exists) {
    return NextResponse.json({ error: "Email already used" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);

  const newUser = {
    id: "user-" + Date.now(),
    name: body.name,
    email: body.email,
    passwordHash,
    role: "customer", // 🔥 บังคับตรงนี้
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

  return NextResponse.json({ success: true });
}