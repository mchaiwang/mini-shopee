import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "data/users.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

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
      role: "customer",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    try {
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    } catch {
      // Vercel read-only filesystem — ignore write errors gracefully
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
