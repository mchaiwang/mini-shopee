import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "ไม่พบไฟล์รูป" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
    const safeName = file.name.replace(/\s+/g, "-");
    const fileName = `${Date.now()}-${safeName}`;

    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
    } catch {
      // Vercel read-only filesystem — return placeholder URL
    }

    const imageUrl = `/uploads/products/${fileName}`;

    return NextResponse.json({ success: true, imageUrl, fileName });
  } catch (error) {
    console.error("POST /api/upload-product-image error:", error);
    return NextResponse.json(
      { success: false, message: "อัปโหลดรูปสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
