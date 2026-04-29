import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type ReviewRecord = {
  id: string;
  status?: "pending" | "published" | "rejected";
  updatedAt?: string;
};

const reviewsFilePath = path.join(process.cwd(), "data", "reviews.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ✅ ใช้ auth cookie แบบเดียวกับ /api/auth/me
function getCurrentUser(req: NextRequest) {
  try {
    const rawAuth = req.cookies.get("auth")?.value;
    if (!rawAuth) return null;

    const user = JSON.parse(decodeURIComponent(rawAuth));
    return user;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getCurrentUser(req);

    // ✅ เช็ก role จาก auth cookie
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "ไม่มีสิทธิ์ใช้งาน" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const reviewId = String(body.id || "");
    const nextStatus = body.status;

    if (!reviewId || !["published", "rejected"].includes(nextStatus)) {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const reviews = readJsonFile<ReviewRecord[]>(reviewsFilePath, []);
    const index = reviews.findIndex((r) => r.id === reviewId);

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบรีวิว" },
        { status: 404 }
      );
    }

    reviews[index] = {
      ...reviews[index],
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    writeJsonFile(reviewsFilePath, reviews);

    return NextResponse.json({
      success: true,
      message: "อัปเดตสำเร็จ",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}