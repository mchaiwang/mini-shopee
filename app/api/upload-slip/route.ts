import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getOrders, saveOrders } from "@/lib/orders";

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

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = file.name.replace(/\s+/g, "-");
    const fileName = `${orderId}-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const slipImageUrl = `/uploads/slips/${fileName}`;

    const orders = getOrders();
    const index = orders.findIndex((order) => order.orderId === orderId);

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบออเดอร์" },
        { status: 404 }
      );
    }

    orders[index].payerName = payerName;
    orders[index].slipFileName = fileName;
    orders[index].slipImageUrl = slipImageUrl;
    orders[index].proofSubmittedAt = new Date().toISOString();
    orders[index].status = "รอตรวจสอบสลิป";

    saveOrders(orders);

    return NextResponse.json({
      success: true,
      message: "อัปโหลดสลิปสำเร็จ",
      order: orders[index]
    });
  } catch (error) {
    console.error("POST /api/upload-slip error:", error);

    return NextResponse.json(
      { success: false, message: "อัปโหลดสลิปไม่สำเร็จ" },
      { status: 500 }
    );
  }
}