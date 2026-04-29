import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "categories.json");

// GET
export async function GET() {
  try {
    const file = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(file);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ categories: [] });
  }
}

// POST (save ทั้งก้อน)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false });
  }
}