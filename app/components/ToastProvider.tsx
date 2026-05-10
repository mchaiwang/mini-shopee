"use client";

import { createContext, useContext, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

const ToastContext = createContext<{
  showToast: (type: ToastType, message: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function showToast(type: ToastType, message: string) {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        style={{
          position: "fixed",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999999,
          width: "calc(100% - 28px)",
          maxWidth: 460,
          display: "grid",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "16px 18px",
              borderRadius: 18,
              background:
                toast.type === "success"
                  ? "#ecfdf3"
                  : toast.type === "error"
                  ? "#fef3f2"
                  : toast.type === "warning"
                  ? "#fffaeb"
                  : "#eff8ff",
              border:
                toast.type === "success"
                  ? "2px solid #12b76a"
                  : toast.type === "error"
                  ? "2px solid #f04438"
                  : toast.type === "warning"
                  ? "2px solid #f79009"
                  : "2px solid #2e90fa",
              color:
                toast.type === "success"
                  ? "#027a48"
                  : toast.type === "error"
                  ? "#b42318"
                  : toast.type === "warning"
                  ? "#b54708"
                  : "#175cd3",
              fontWeight: 900,
              fontSize: 16,
              lineHeight: 1.45,
              boxShadow: "0 18px 45px rgba(15,23,42,0.24)",
              pointerEvents: "auto",
              textAlign: "center",
            }}
          >
            {toast.type === "success" && "✅ "}
            {toast.type === "error" && "❌ "}
            {toast.type === "warning" && "⚠️ "}
            {toast.type === "info" && "ℹ️ "}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}