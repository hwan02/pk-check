export type SupportStatus = "open" | "answered" | "closed";

export interface SupportThread {
  id: string;
  user_id: string;
  order_id: string | null;
  subject: string;
  status: SupportStatus;
  customer_unread: number;
  admin_unread: number;
  last_message_at: string;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  sender_role: "customer" | "admin";
  sender_id: string | null;
  body: string;
  created_at: string;
}

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  open: "대기",
  answered: "답변완료",
  closed: "종료",
};

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR");
}
