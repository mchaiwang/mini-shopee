import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  images?: string[];
  shortDescription: string;
  category: string;
  stock: number;
};

const jsonFilePath = path.join(process.cwd(), "data", "products.json");
const legacyJsPaths = [
  path.join(process.cwd(), "data", "products.js"),
  path.join(process.cwd(), "products.js"),
];

function ensureDataFile() {
  try {
    const dir = path.dirname(jsonFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(jsonFilePath)) {
      fs.writeFileSync(jsonFilePath, "[]", "utf8");
    }
  } catch {
    // Vercel read-only filesystem — ignore
  }
}

function normalizeImages(input: unknown, fallbackImage?: string): string[] {
  const base = Array.isArray(input)
    ? input.filter(
        (item): item is string =>
          typeof item === "string" && item.trim() !== ""
      )
    : [];

  const cleaned = base.map((item) => item.trim()).filter(Boolean);

  if (
    fallbackImage &&
    fallbackImage.trim() !== "" &&
    !cleaned.includes(fallbackImage.trim())
  ) {
    cleaned.unshift(fallbackImage.trim());
  }

  return cleaned.slice(0, 4);
}

function normalizeProduct(product: any): Product {
  const image =
    typeof product?.image === "string" && product.image.trim() !== ""
      ? product.image.trim()
      : "/no-image.png";

  const images = normalizeImages(product?.images, image);
  const coverImage = images[0] || image || "/no-image.png";

  return {
    id: Number(product?.id) || Date.now(),
    name: typeof product?.name === "string" ? product.name : "",
    slug: typeof product?.slug === "string" ? product.slug : "",
    price: Number(product?.price) || 0,
    image: coverImage,
    images,
    shortDescription:
      typeof product?.shortDescription === "string"
        ? product.shortDescription
        : "",
    category: typeof product?.category === "string" ? product.category : "",
    stock: Number(product?.stock) || 0,
  };
}

function extractArrayFromLegacyJs(raw: string): any[] {
  try {
    const match = raw.match(/const\s+products\s*=\s*(\[[\s\S]*\]);?\s*export\s+default\s+products;?/);
    if (!match || !match[1]) return [];
    const arrayLiteral = match[1];
    const parsed = new Function(`return (${arrayLiteral});`)();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLegacyProductsFromJs(): Product[] {
  try {
    for (const filePath of legacyJsPaths) {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = extractArrayFromLegacyJs(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeProduct);
      }
    }
    return [];
  } catch {
    return [];
  }
}

function readProductsFromJson(): Product[] {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(jsonFilePath, "utf8");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProduct);
  } catch {
    return [];
  }
}

function readProducts(): Product[] {
  const jsonProducts = readProductsFromJson();
  if (jsonProducts.length > 0) return jsonProducts;

  const legacyProducts = readLegacyProductsFromJs();
  if (legacyProducts.length > 0) {
    writeProducts(legacyProducts);
    return legacyProducts;
  }

  return [];
}

function writeProducts(products: Product[]) {
  try {
    ensureDataFile();
    fs.writeFileSync(jsonFilePath, JSON.stringify(products, null, 2), "utf8");
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

export async function GET() {
  try {
    const products = readProducts();
    return NextResponse.json({ success: true, products });
  } catch {
    return NextResponse.json(
      { success: false, message: "โหลดสินค้าไม่สำเร็จ", products: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const products = readProducts();

    const nextId =
      products.length > 0
        ? Math.max(...products.map((item) => Number(item.id) || 0)) + 1
        : 1;

    const incomingImage =
      typeof body?.image === "string" && body.image.trim() !== ""
        ? body.image.trim()
        : "/no-image.png";

    const incomingImages = normalizeImages(body?.images, incomingImage);
    const coverImage = incomingImages[0] || incomingImage || "/no-image.png";

    const newProduct: Product = normalizeProduct({
      id: nextId,
      name: body?.name,
      slug: body?.slug,
      price: body?.price,
      image: coverImage,
      images: incomingImages,
      shortDescription: body?.shortDescription,
      category: body?.category,
      stock: body?.stock,
    });

    products.unshift(newProduct);
    writeProducts(products);

    return NextResponse.json({
      success: true,
      message: "เพิ่มสินค้าสำเร็จ",
      product: newProduct,
      products,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "เพิ่มสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const incomingId = Number(body?.id) || 0;
    const incomingSlug =
      typeof body?.slug === "string" ? body.slug.trim() : "";

    if (!incomingId && !incomingSlug) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ id หรือ slug สินค้า" },
        { status: 400 }
      );
    }

    const products = readProducts();
    let index = -1;

    if (incomingId) {
      index = products.findIndex((item) => Number(item.id) === incomingId);
    }

    if (index === -1 && incomingSlug) {
      index = products.findIndex(
        (item) =>
          String(item.slug).trim().toLowerCase() === incomingSlug.toLowerCase()
      );
    }

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบสินค้า" },
        { status: 404 }
      );
    }

    const current = products[index];

    const nextImage =
      typeof body?.image === "string" && body.image.trim() !== ""
        ? body.image.trim()
        : current.image || "/no-image.png";

    const nextImages = normalizeImages(
      body?.images ?? current.images ?? [],
      nextImage
    );

    const updatedProduct: Product = normalizeProduct({
      ...current,
      ...body,
      id: current.id,
      image: nextImages[0] || nextImage || "/no-image.png",
      images: nextImages,
    });

    products[index] = updatedProduct;
    writeProducts(products);

    return NextResponse.json({
      success: true,
      message: "แก้ไขสินค้าสำเร็จ",
      product: updatedProduct,
      products,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "แก้ไขสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ id สินค้า" },
        { status: 400 }
      );
    }

    const products = readProducts();
    const filtered = products.filter((item) => Number(item.id) !== id);

    writeProducts(filtered);

    return NextResponse.json({
      success: true,
      message: "ลบสินค้าสำเร็จ",
      products: filtered,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "ลบสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
