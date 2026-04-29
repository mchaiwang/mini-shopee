import fs from "fs";
import path from "path";

export type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  shortDescription: string;
  category: string;
  stock: number;
};

const filePath = path.join(process.cwd(), "storage", "products.json");

export function getProducts(): Product[] {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf-8");
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (error) {
    console.error("getProducts error:", error);
    return [];
  }
}

export function saveProducts(products: Product[]) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
  } catch (error) {
    console.error("saveProducts error:", error);
  }
}

export function addProduct(product: Omit<Product, "id">) {
  const products = getProducts();

  const nextId =
    products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;

  const newProduct: Product = {
    id: nextId,
    ...product
  };

  products.push(newProduct);
  saveProducts(products);

  return newProduct;
}

// 🔹 แก้ไขสินค้า
export function updateProduct(
  productId: number,
  updates: Omit<Product, "id">
) {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === productId);

  if (index === -1) {
    return null;
  }

  products[index] = {
    id: productId,
    ...updates
  };

  saveProducts(products);
  return products[index];
}
export function deleteProduct(productId: number) {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== productId);
  saveProducts(filtered);
  return filtered;
}
