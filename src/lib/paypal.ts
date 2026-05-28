// PayPal API 헬퍼.
// PAYPAL_ENV=live 일 때만 라이브, 기본은 sandbox.
const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET!;
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await resp.json();
  return data.access_token;
}

export async function createPayPalOrder(totalUsd: number, orderId: string) {
  const token = await getAccessToken();

  const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          amount: {
            currency_code: "USD",
            value: totalUsd.toFixed(2),
          },
        },
      ],
    }),
  });

  return resp.json();
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const token = await getAccessToken();

  const resp = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return resp.json();
}

// 환불 — 부분 환불 가능. amountUsd 생략하면 전액 환불.
export async function refundPayPalCapture(
  captureId: string,
  amountUsd?: number,
  noteToPayer?: string,
) {
  const token = await getAccessToken();

  const body: Record<string, unknown> = {};
  if (typeof amountUsd === "number") {
    body.amount = { currency_code: "USD", value: amountUsd.toFixed(2) };
  }
  if (noteToPayer) body.note_to_payer = noteToPayer;

  const resp = await fetch(
    `${PAYPAL_BASE}/v2/payments/captures/${captureId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return resp.json();
}

/**
 * Webhook 시그니처 검증 — PayPal 의 Verify Webhook Signature API 호출.
 * 환경변수 PAYPAL_WEBHOOK_ID 가 필요 (Developer Dashboard 에서 webhook 등록 시 발급).
 */
export async function verifyPayPalWebhook(params: {
  headers: Record<string, string>;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // 키 안 설정됐으면 dev/preview 환경 — 일단 통과 (로그만)
    console.warn("[paypal webhook] PAYPAL_WEBHOOK_ID not set — skipping verify");
    return true;
  }

  // 헤더 키 lowercase 정규화
  const h = Object.fromEntries(
    Object.entries(params.headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const required = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  for (const k of required) {
    if (!h[k]) {
      console.warn(`[paypal webhook] missing header: ${k}`);
      return false;
    }
  }

  const token = await getAccessToken();
  const resp = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: h["paypal-auth-algo"],
      cert_url: h["paypal-cert-url"],
      transmission_id: h["paypal-transmission-id"],
      transmission_sig: h["paypal-transmission-sig"],
      transmission_time: h["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(params.rawBody),
    }),
  });
  const data = (await resp.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}
