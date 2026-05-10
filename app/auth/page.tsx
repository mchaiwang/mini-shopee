"use client";

import { useState } from "react";
import { useToast } from "@/app/components/ToastProvider";

type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
};

const USERS_KEY = "herbal_users";
const CURRENT_USER_KEY = "herbal_current_user";

export default function AuthPage() {
  const { showToast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("register");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const handleRegister = () => {
    if (!name || !email || !password || !phone || !address) {
      showToast("warning", "กรอกข้อมูลให้ครบ");
      return;
    }

    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

    const exists = users.find((u) => u.email === email);
    if (exists) {
      showToast("error", "อีเมลนี้ถูกใช้แล้ว");
      return;
    }

    const newUser: User = {
      id: Date.now(),
      name,
      email,
      password,
      phone,
      address,
    };

    const updatedUsers = [newUser, ...users];
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

    showToast("success", "สมัครสมาชิกสำเร็จ");
    window.location.href = "/";
  };

  const handleLogin = () => {
    if (!email || !password) {
      showToast("warning", "กรอกอีเมลและรหัสผ่าน");
      return;
    }

    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    const found = users.find((u) => u.email === email && u.password === password);

    if (!found) {
      showToast("error", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
    showToast("success", "เข้าสู่ระบบสำเร็จ");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow">
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setMode("register")}
            className={`rounded-xl px-5 py-3 text-lg ${
              mode === "register"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            สมัครสมาชิก
          </button>

          <button
            onClick={() => setMode("login")}
            className={`rounded-xl px-5 py-3 text-lg ${
              mode === "login"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            เข้าสู่ระบบ
          </button>

          <a
            href="/"
            className="ml-auto rounded-xl bg-slate-800 px-5 py-3 text-lg text-white"
          >
            กลับหน้าร้าน
          </a>
        </div>

        {mode === "register" ? (
          <>
            <h1 className="mb-6 text-3xl font-bold text-green-700">
              สมัครสมาชิก
            </h1>

            <div className="grid gap-4">
              <input
                placeholder="ชื่อ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border p-4 text-lg"
              />

              <input
                placeholder="อีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border p-4 text-lg"
              />

              <input
                placeholder="รหัสผ่าน"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border p-4 text-lg"
              />

              <input
                placeholder="เบอร์โทร"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border p-4 text-lg"
              />

              <textarea
                placeholder="ที่อยู่จัดส่ง"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-2xl border p-4 text-lg"
                rows={4}
              />

              <button
                onClick={handleRegister}
                className="w-full rounded-2xl bg-green-600 py-4 text-2xl font-bold text-white"
              >
                สมัครสมาชิก
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-6 text-3xl font-bold text-blue-700">
              เข้าสู่ระบบ
            </h1>

            <div className="grid gap-4">
              <input
                placeholder="อีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border p-4 text-lg"
              />

              <input
                placeholder="รหัสผ่าน"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border p-4 text-lg"
              />

              <button
                onClick={handleLogin}
                className="w-full rounded-2xl bg-blue-600 py-4 text-2xl font-bold text-white"
              >
                เข้าสู่ระบบ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}