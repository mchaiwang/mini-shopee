import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const filePath = path.join(process.cwd(), "data", "shipping-senders.json");

function readData() {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeData(data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json({ senders: readData() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const data = readData();

    const newItem = {
      id: body.id || "sender-" + Date.now(),
      name: body.shopName,
      senderName: body.senderName,
      phone: body.phone,
      address: body.address,
      isDefault: body.isDefault || false,
    };

    // reset default
    if (newItem.isDefault) {
      data.forEach((s: any) => (s.isDefault = false));
    }

    const index = data.findIndex((s: any) => s.id === newItem.id);

    if (index >= 0) {
      data[index] = newItem;
    } else {
      data.push(newItem);
    }

    writeData(data);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const data = readData().filter((s: any) => s.id !== body.id);
  writeData(data);
  return NextResponse.json({ success: true });
}