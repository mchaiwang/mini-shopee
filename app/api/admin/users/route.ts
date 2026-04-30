import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserItem = {
  id?: string;
  email?: string;
  name?: string;
  fullName?: string;
  username?: string;
  role?: string;
};

type NormalizedUser = {
  id: string;
  email: string;
  name: string;
  fullName: string;
  username: string;
  role: string;
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
    const usersPath = path.join(process.cwd(), "data", "users.json");
    const rawUsers = readJsonFile(usersPath, []);

    const users: UserItem[] = Array.isArray(rawUsers)
      ? rawUsers
      : Array.isArray(rawUsers?.users)
      ? rawUsers.users
      : [];

    const normalized: NormalizedUser[] = users
      .map((u: UserItem, index: number): NormalizedUser => ({
        id: String(u?.id ?? `user-${index + 1}`),
        email: u?.email ?? "",
        name: u?.name ?? "",
        fullName: u?.fullName ?? "",
        username: u?.username ?? "",
        role: u?.role ?? "customer",
      }))
      .filter((u: NormalizedUser) => u.role !== "admin");

    return NextResponse.json({ users: normalized });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้" },
      { status: 500 }
    );
  }
}
