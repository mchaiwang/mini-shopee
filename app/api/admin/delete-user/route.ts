import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function writeJsonFile(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

function getArrayData(raw: any) {
  if (Array.isArray(raw)) return { list: raw, wrapped: false, key: "" };

  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.users)) return { list: raw.users, wrapped: true, key: "users" };
    if (Array.isArray(raw.reviews)) return { list: raw.reviews, wrapped: true, key: "reviews" };
    if (Array.isArray(raw.data)) return { list: raw.data, wrapped: true, key: "data" };
  }

  return { list: [], wrapped: false, key: "" };
}

function attachArrayData(raw: any, key: string, list: any[]) {
  if (Array.isArray(raw)) return list;
  if (raw && typeof raw === "object" && key) {
    return {
      ...raw,
      [key]: list,
    };
  }
  return list;
}

function isOwnedByUser(review: any, userId: string) {
  const uid = String(userId);

  const possibleKeys = [
    "userId",
    "creatorUserId",
    "creatorId",
    "ownerId",
    "authorId",
    "reviewerId",
  ];

  return possibleKeys.some((key) => String(review?.[key] ?? "") === uid);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId ?? "").trim();

    if (!userId) {
      return NextResponse.json(
        { error: "กรุณาระบุ userId" },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), "data");
    const usersPath = path.join(dataDir, "users.json");
    const reviewsPath = path.join(dataDir, "reviews.json");

    const rawUsers = readJsonFile(usersPath, []);
    const rawReviews = readJsonFile(reviewsPath, []);

    const usersInfo = getArrayData(rawUsers);
    const reviewsInfo = getArrayData(rawReviews);

    const users = usersInfo.list;
    const reviews = reviewsInfo.list;

    const targetUser = users.find((u: any) => String(u?.id ?? "") === userId);

    if (!targetUser) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้งานที่ต้องการลบ" },
        { status: 404 }
      );
    }

    if (String(targetUser?.role ?? "") === "admin") {
      return NextResponse.json(
        { error: "ไม่อนุญาตให้ลบ admin" },
        { status: 403 }
      );
    }

    const nextUsers = users.filter((u: any) => String(u?.id ?? "") !== userId);
    const deletedReviews = reviews.filter((r: any) => isOwnedByUser(r, userId)).length;
    const nextReviews = reviews.filter((r: any) => !isOwnedByUser(r, userId));

    writeJsonFile(usersPath, attachArrayData(rawUsers, usersInfo.key, nextUsers));
    writeJsonFile(
      reviewsPath,
      attachArrayData(rawReviews, reviewsInfo.key, nextReviews)
    );

    return NextResponse.json({
      ok: true,
      deletedUserId: userId,
      deletedReviews,
    });
  } catch (error) {
    console.error("POST /api/admin/delete-user error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" },
      { status: 500 }
    );
  }
}
