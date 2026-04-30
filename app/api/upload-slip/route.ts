import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ordersFile = path.join(process.cwd(), "data", "orders.json");

function getOrders(): any[] {
  try {
    if (!fs.existsSync(ordersFile)) return [];
    const raw = fs.readFileSync(ordersFile, "utf8");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: any[]) {
  try {
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), "utf8");
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const orderId = String(formData.get("orderId") || "");
    const payerName = String(formData.get("payerName") || "");
    const file = formData.get("slip") as File | null;

    if (!orderId || !payerName || !file) {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไม่ครบ" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "slips");
    const safeName = file.name.replace(/\s+/g, "-");
    const fileName = `${orderId}-${Date.now()}-${safeName}`;

    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
    } catch {
      // Vercel read-only filesystem — continue without saving file
    }

    const slipImageUrl = `/uploads/slips/${fileName}`;

    const orders = getOrders();
    const index = orders.findIndex(
      (order) => order.id === orderId || order.orderId === orderId
    );

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบออเดอร์" },
        { status: 404 }
      );
    }

    orders[index].payerName = payerName;
    orders[index].slipFileName = fileName;
    orders[index].slipImageUrl = slipImageUrl;
    orders[index].slip = slipImageUrl;
    orders[index].slipName = fileName;
    orders[index].proofSubmittedAt = new Date().toISOString();
    orders[index].status = "รอตรวจสอบการชำระเงิน";

    saveOrders(orders);

    return NextResponse.json({
      success: true,
      message: "อัปโหลดสลิปสำเร็จ",
      order: orders[index],
    });
  } catch (error) {
    console.error("POST /api/upload-slip error:", error);
    return NextResponse.json(
      { success: false, message: "อัปโหลดสลิปไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
