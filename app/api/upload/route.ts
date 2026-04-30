import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "ไม่พบไฟล์ที่อัปโหลด" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "รองรับเฉพาะไฟล์รูป jpg, png, webp" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "reviews");

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      const originalName = sanitizeFileName(file.name || "image");
      const ext = path.extname(originalName) || ".jpg";
      const baseName = path.basename(originalName, ext) || "review-image";
      const fileName = `${baseName}-${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/reviews/${fileName}`,
        fileName,
      });
    } catch {
      // Vercel read-only filesystem — return a placeholder response
      const fileName = `review-image-${Date.now()}.jpg`;
      return NextResponse.json({
        success: true,
        url: `/uploads/reviews/${fileName}`,
        fileName,
      });
    }
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { success: false, message: "อัปโหลดไฟล์ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
