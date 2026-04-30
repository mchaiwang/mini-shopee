import { NextResponse } from "next/server";
import products from "@/data/products";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    success: true,
    products
  });
}