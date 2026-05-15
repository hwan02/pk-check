"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuccessToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // URL에서 success 파라미터 제거
      window.history.replaceState(null, "", "/orders");
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  if (!visible) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm text-center animate-fade-out">
      {message}
      <style>{`
        @keyframes fadeOut {
          0%, 70% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-fade-out {
          animation: fadeOut 4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
