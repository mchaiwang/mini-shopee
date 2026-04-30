import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "data", "categories.json");

export async function GET() {
  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ categories: [] });
    }
    const file = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(file);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ categories: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    try {
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
    } catch {
      // Vercel read-only filesystem — ignore write errors gracefully
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
