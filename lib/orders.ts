import fs from "fs";
import path from "path";

export type OrderItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
};

export type Order = {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  payerName?: string;
  slipFileName?: string;
  slipImageUrl?: string;
  proofSubmittedAt?: string;
  items: OrderItem[];
  archived?: boolean;
};

const filePath = path.join(process.cwd(), "storage", "orders.json");

export function getOrders(): Order[] {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf-8");
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (error) {
    console.error("getOrders error:", error);
    return [];
  }
}

export function saveOrders(orders: Order[]) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), "utf-8");
  } catch (error) {
    console.error("saveOrders error:", error);
  }
}

export function addOrder(order: Order) {
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  return order;
}