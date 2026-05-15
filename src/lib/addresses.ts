export interface ShippingAddressInput {
  label?: string | null;
  recipient_name: string;
  phone?: string | null;
  country: string;
  postal_code: string;
  address1: string;
  address2?: string | null;
  is_default?: boolean;
}

export interface ShippingAddress {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string;
  phone: string | null;
  country: string;
  postal_code: string;
  address1: string;
  address2: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function optStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export function validateAddressInput(body: unknown): { ok: true; data: ShippingAddressInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "잘못된 요청" };
  const b = body as Record<string, unknown>;

  const recipient = typeof b.recipient_name === "string" ? b.recipient_name.trim() : "";
  if (!recipient) return { ok: false, error: "수령인을 입력하세요" };
  if (recipient.length > 50) return { ok: false, error: "수령인은 50자 이내" };

  const postal = typeof b.postal_code === "string" ? b.postal_code.trim() : "";
  if (!postal) return { ok: false, error: "우편번호를 입력하세요" };

  const address1 = typeof b.address1 === "string" ? b.address1.trim() : "";
  if (!address1) return { ok: false, error: "주소를 입력하세요" };

  const country = typeof b.country === "string" && b.country.trim() ? b.country.trim().toUpperCase() : "KR";

  return {
    ok: true,
    data: {
      label: optStr(b.label),
      recipient_name: recipient,
      phone: optStr(b.phone),
      country,
      postal_code: postal,
      address1,
      address2: optStr(b.address2),
      is_default: b.is_default === true,
    },
  };
}
