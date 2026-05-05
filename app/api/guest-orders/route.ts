import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function maskPhone(phone: string) {
  const p = normalizePhone(phone);
  if (p.length < 6) return phone;
  return p.slice(0, 3) + "xxxx" + p.slice(-3);
}

export async function GET(req: NextRequest) {
  try {
    const phone = normalizePhone(req.nextUrl.searchParams.get("phone") || "");

    if (!phone || phone.length < 8) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกเบอร์โทรให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "data", "orders.json");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const orders = JSON.parse(raw || "[]");

    const matched = orders
      .filter((order: any) => {
        const orderPhone =
          order.phone ||
          order.customerPhone ||
          order.tel ||
          order.shippingPhone ||
          order.deliveryPhone ||
          "";

        return normalizePhone(orderPhone) === phone;
      })
      .map((order: any) => ({
        id: order.id || order.orderId || order._id || "-",
        status: order.status || "รอจัดเตรียมสินค้า",
        createdAt: order.createdAt || order.date || "",
        name: order.name || order.fullName || order.customerName || "",
        phone: maskPhone(order.phone || order.customerPhone || order.tel || ""),
        address: order.address || order.shippingAddress || "",
        total: order.total || order.totalPrice || order.grandTotal || 0,
        trackingNo: order.trackingNo || order.trackingNumber || "",
        shippingProvider: order.shippingProvider || order.courier || "",
        items: Array.isArray(order.items) ? order.items : [],
      }))
      .sort((a: any, b: any) => {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });

    return NextResponse.json({
      ok: true,
      orders: matched,
    });
  } catch (error) {
    console.error("GET /api/guest-orders error:", error);
    return NextResponse.json(
      { ok: false, message: "เกิดข้อผิดพลาดในการค้นหาคำสั่งซื้อ" },
      { status: 500 }
    );
  }
}