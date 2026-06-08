export type RaffleCategory = "pokemon" | "onepiece" | "other";

export interface Raffle {
  id: string;
  category: RaffleCategory;
  title: string;
  title_ja: string | null;
  image_url: string | null;
  apply_start_at: string | null;
  apply_end_at: string | null;
  draw_at: string | null;
  ship_note: string | null;
  amazon_url: string;
  price_jpy: number | null;
  notes: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type RaffleStatus = "upcoming" | "open" | "awaiting_draw" | "closed";

export interface RaffleStatusInfo {
  status: RaffleStatus;
  label: string;
  /** D-day 까지 남은 일(절대값). null 이면 표시할 일자 없음. */
  daysTo: number | null;
  /** 라벨에 붙는 보조 텍스트 — "마감 D-3" 같은 형태 */
  hint: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(now: Date, target: Date): number {
  // 시각 무시하고 KST 기준 캘린더 일수만 비교 (대략적인 D-day 표현)
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const a = new Date(Math.floor((now.getTime() + KST_OFFSET) / MS_PER_DAY) * MS_PER_DAY);
  const b = new Date(Math.floor((target.getTime() + KST_OFFSET) / MS_PER_DAY) * MS_PER_DAY);
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function getRaffleStatus(r: Raffle, now: Date = new Date()): RaffleStatusInfo {
  const start = r.apply_start_at ? new Date(r.apply_start_at) : null;
  const end = r.apply_end_at ? new Date(r.apply_end_at) : null;
  const draw = r.draw_at ? new Date(r.draw_at) : null;

  // 모든 일정이 없으면 항상 "응모중"
  if (!start && !end && !draw) {
    return { status: "open", label: "응모중", daysTo: null, hint: null };
  }

  // 시작 전
  if (start && now < start) {
    const d = daysBetween(now, start);
    return {
      status: "upcoming",
      label: "예정",
      daysTo: d,
      hint: d === 0 ? "오늘 시작" : `시작 D-${d}`,
    };
  }

  // 응모중
  if ((!start || now >= start) && (!end || now < end)) {
    if (end) {
      const d = daysBetween(now, end);
      return {
        status: "open",
        label: "응모중",
        daysTo: d,
        hint: d === 0 ? "오늘 마감" : `마감 D-${d}`,
      };
    }
    return { status: "open", label: "응모중", daysTo: null, hint: null };
  }

  // 마감 됨 → 추첨 대기 or 종료
  if (draw && now < draw) {
    const d = daysBetween(now, draw);
    return {
      status: "awaiting_draw",
      label: "추첨 대기",
      daysTo: d,
      hint: d === 0 ? "오늘 추첨" : `추첨 D-${d}`,
    };
  }

  return { status: "closed", label: "종료", daysTo: null, hint: null };
}

export const RAFFLE_CATEGORY_LABEL: Record<RaffleCategory, string> = {
  pokemon: "포켓몬",
  onepiece: "원피스",
  other: "기타",
};

export function formatJPY(n: number | null | undefined): string {
  if (n == null) return "-";
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 날짜만 KST 로 yyyy.mm.dd 형식 */
export function formatKstDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** created_at 이 N일 이내면 true. NEW 배지용. */
export function isNewlyAdded(createdAtIso: string | null | undefined, withinDays = 3): boolean {
  if (!createdAtIso) return false;
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  return ageMs < withinDays * 24 * 60 * 60 * 1000;
}

/** datetime-local 입력 형식 (yyyy-MM-ddTHH:mm) — KST 로 표시 */
export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

/** datetime-local 값(KST 로 입력) → ISO(UTC). 빈 값이면 null. */
export function fromLocalInputValue(v: string | null | undefined): string | null {
  if (!v) return null;
  // "yyyy-MM-ddTHH:mm" 을 KST(+09:00) 로 해석
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  const iso = `${y}-${mo}-${d}T${hh}:${mm}:00+09:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
