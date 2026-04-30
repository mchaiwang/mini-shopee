import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthCookieUser = {
  id?: string;
  email?: string;
  [key: string]: any;
};

function readJsonFile(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const rawAuth = cookieStore.get("auth")?.value;

    if (!rawAuth) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const cookieUser: AuthCookieUser = JSON.parse(decodeURIComponent(rawAuth));

    const usersPath = path.join(process.cwd(), "data", "users.json");
    const rawUsers = readJsonFile(usersPath, []);

    const users = Array.isArray(rawUsers)
      ? rawUsers
      : Array.isArray(rawUsers?.users)
        ? rawUsers.users
        : [];

    const matchedUser =
      users.find((u: any) => String(u?.id || "") === String(cookieUser?.id || "")) ||
      users.find(
        (u: any) =>
          String(u?.email || "").toLowerCase() ===
          String(cookieUser?.email || "").toLowerCase()
      );

    const user = matchedUser || cookieUser;

    return NextResponse.json({ user });
  } catch (error) {
    console.error("ME ERROR:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
