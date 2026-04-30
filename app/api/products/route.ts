import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCTS_PATH = path.join(process.cwd(), "data", "products.json");

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  images?: string[];
  shortDescription: string;
  descriptionLong?: string;
  careNote?: string;
  category: string;
  stock: number;
  reviewUrl?: string;
};

function readProducts(): Product[] {
  try {
    if (!fs.existsSync(PRODUCTS_PATH)) return [];
    const raw = fs.readFileSync(PRODUCTS_PATH, "utf8");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProducts(products: Product[]) {
  try {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf8");
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

function normalizeImages(input: unknown, fallbackImage?: string): string[] {
  const arr = Array.isArray(input) ? input : [];
  const cleaned = arr.filter((item): item is string => typeof item === "string" && item.trim() !== "");

  const merged = [...cleaned];
  if (fallbackImage && !merged.includes(fallbackImage)) {
    merged.unshift(fallbackImage);
  }

  return merged.slice(0, 4);
}

export async function GET() {
  try {
    const products = readProducts().map((product) => {
      const images = normalizeImages(product.images, product.image);
      return {
        ...product,
        image: images[0] || product.image || "/no-image.png",
        images,
        reviewUrl: product.reviewUrl || "",
        descriptionLong: product.descriptionLong || "",
        careNote: product.careNote || "",
      };
    });

    return NextResponse.json({ success: true, products });
  } catch {
    return NextResponse.json(
      { success: false, message: "โหลดสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const products = readProducts();

    const images = normalizeImages(body.images, body.image);
    const coverImage = images[0] || body.image || "/no-image.png";

    const newProduct: Product = {
      id: products.length > 0 ? Math.max(...products.map((p) => Number(p.id) || 0)) + 1 : 1,
      name: String(body.name || "").trim(),
      slug: String(body.slug || "").trim(),
      price: Number(body.price) || 0,
      image: coverImage,
      images,
      shortDescription: String(body.shortDescription || "").trim(),
      category: String(body.category || "").trim(),
      stock: Number(body.stock) || 0,
      reviewUrl: String(body.reviewUrl || "").trim(),
      descriptionLong: String(body.descriptionLong || "").trim(),
      careNote: String(body.careNote || "").trim(),
    };

    products.unshift(newProduct);
    writeProducts(products);

    return NextResponse.json({ success: true, product: newProduct });
  } catch {
    return NextResponse.json(
      { success: false, message: "เพิ่มสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ id สินค้า" },
        { status: 400 }
      );
    }

    const products = readProducts();
    const index = products.findIndex((p) => Number(p.id) === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบสินค้า" },
        { status: 404 }
      );
    }

    const oldProduct = products[index];
    const images = normalizeImages(body.images, body.image);
    const coverImage = images[0] || body.image || oldProduct.image || "/no-image.png";

    const updatedProduct: Product = {
      ...oldProduct,
      name: String(body.name ?? oldProduct.name).trim(),
      slug: String(body.slug ?? oldProduct.slug).trim(),
      price: Number(body.price ?? oldProduct.price) || 0,
      image: coverImage,
      images,
      shortDescription: String(body.shortDescription ?? oldProduct.shortDescription).trim(),
      category: String(body.category ?? oldProduct.category).trim(),
      stock: Number(body.stock ?? oldProduct.stock) || 0,
      reviewUrl: String(body.reviewUrl ?? oldProduct.reviewUrl ?? "").trim(),
      descriptionLong: String(body.descriptionLong ?? oldProduct.descriptionLong ?? "").trim(),
      careNote: String(body.careNote ?? oldProduct.careNote ?? "").trim(),
    };

    products[index] = updatedProduct;
    writeProducts(products);

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch {
    return NextResponse.json(
      { success: false, message: "แก้ไขสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ id สินค้า" },
        { status: 400 }
      );
    }

    const products = readProducts();
    const filtered = products.filter((p) => Number(p.id) !== id);

    writeProducts(filtered);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "ลบสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
