"use client";

import { useEffect } from "react";

interface Props {
  threadId: string;
  side: "customer" | "admin";
}

// 진입 시 unread 카운터 0으로
export default function MarkRead({ threadId, side }: Props) {
  useEffect(() => {
    fetch(`/api/support/${threadId}/read`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ side }),
    }).catch(() => {});
  }, [threadId, side]);
  return null;
}
