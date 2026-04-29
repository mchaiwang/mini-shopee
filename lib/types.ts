export type Role = "customer" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  address?: string;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type OrderItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
};

export type Order = {
  orderId: string;
  userId?: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  note?: string;
  slipImage?: string;
  slipFileName?: string;
  paymentInfo?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    promptpay?: string;
  } | null;
  items: OrderItem[];
};