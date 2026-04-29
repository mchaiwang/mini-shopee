import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type ReviewTitleItem = {
  id: string;
  label: string;
  active: boolean;
  sortOrder?: number;
};

const filePath = path.join(process.cwd(), "data", "review-titles.json");

function ensureFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }
}

function readItems(): ReviewTitleItem[] {
  try {
    ensureFile();
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeItems(items: ReviewTitleItem[]) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf8");
}

export async function GET() {
  try {
    const items = readItems().sort(
      (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    );

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("GET /api/review-titles error:", error);
    return NextResponse.json(
      { success: false, message: "โหลดหัวข้อรีวิวไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = String(body?.mode || "").trim();

    const items = readItems();

    if (mode === "create") {
      const label = String(body?.label || "").trim();
      if (!label) {
        return NextResponse.json(
          { success: false, message: "กรุณากรอกหัวข้อรีวิว" },
          { status: 400 }
        );
      }

      const next: ReviewTitleItem = {
        id: `rt-${Date.now()}`,
        label,
        active: body?.active !== false,
        sortOrder:
          typeof body?.sortOrder === "number"
            ? body.sortOrder
            : items.length + 1,
      };

      const updated = [...items, next];
      writeItems(updated);

      return NextResponse.json({ success: true, item: next });
    }

    if (mode === "update") {
      const id = String(body?.id || "").trim();
      const label = String(body?.label || "").trim();

      if (!id) {
        return NextResponse.json(
          { success: false, message: "ไม่พบ id" },
          { status: 400 }
        );
      }

      const updated = items.map((item) =>
        item.id === id
          ? {
              ...item,
              label: label || item.label,
              active:
                typeof body?.active === "boolean" ? body.active : item.active,
              sortOrder:
                typeof body?.sortOrder === "number"
                  ? body.sortOrder
                  : item.sortOrder,
            }
          : item
      );

      writeItems(updated);

      return NextResponse.json({ success: true });
    }

    if (mode === "delete") {
      const id = String(body?.id || "").trim();
      if (!id) {
        return NextResponse.json(
          { success: false, message: "ไม่พบ id" },
          { status: 400 }
        );
      }

      const updated = items.filter((item) => item.id !== id);
      writeItems(updated);

      return NextResponse.json({ success: true });
    }

    if (mode === "replace-all") {
      const nextItems = Array.isArray(body?.items) ? body.items : [];
      writeItems(nextItems);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: "mode ไม่ถูกต้อง" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/review-titles error:", error);
    return NextResponse.json(
      { success: false, message: "บันทึกหัวข้อรีวิวไม่สำเร็จ" },
      { status: 500 }
    );
  }
}