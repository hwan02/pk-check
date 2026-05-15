import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface ShippingMailParams {
  to: string;
  orderNo: string;
  itemsSummary: string;
  estimatedShippingUsd: number;
  actualShippingUsd: number;
  paypalPaymentLink: string;
}

export async function sendShippingInvoice(params: ShippingMailParams) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="padding: 24px 0; border-bottom: 1px solid #eee;">
        <h1 style="font-size: 20px; font-weight: 900; letter-spacing: -0.04em; margin: 0;">KIKIDULT</h1>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 16px;">배송비 확정 안내</h2>

        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px; opacity: 0.8;">
          주문번호 <strong>${params.orderNo}</strong>의 실제 배송비가 확정되었습니다.
        </p>

        <div style="background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
          <p style="font-size: 12px; opacity: 0.6; margin: 0 0 8px;">주문 상품</p>
          <p style="font-size: 14px; margin: 0;">${params.itemsSummary}</p>
        </div>

        <div style="background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; opacity: 0.6;">예상 배송비</td>
              <td style="padding: 4px 0; text-align: right;">$${params.estimatedShippingUsd.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 700;">확정 배송비</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #f15746;">$${params.actualShippingUsd.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; line-height: 1.6; margin: 0 0 20px; opacity: 0.8;">
          아래 버튼을 눌러 배송비를 결제해주세요.<br/>
          결제 확인 후 영업일 1-2일 내 발송됩니다.
        </p>

        <a href="${params.paypalPaymentLink}"
           style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
          배송비 결제하기
        </a>
      </div>

      <div style="padding: 16px 0; border-top: 1px solid #eee; font-size: 11px; opacity: 0.5;">
        <p style="margin: 0;">Kikidult — TCG Market<br/>문의: ${process.env.GMAIL_USER}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Kikidult" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: `[Kikidult] 배송비 확정 안내 - 주문 ${params.orderNo}`,
    html,
  });
}

interface OrderConfirmParams {
  to: string;
  orderNo: string;
  itemsSummary: string;
  totalUsd: number;
  estimatedShippingUsd: number;
}

export async function sendOrderConfirmation(params: OrderConfirmParams) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="padding: 24px 0; border-bottom: 1px solid #eee;">
        <h1 style="font-size: 20px; font-weight: 900; letter-spacing: -0.04em; margin: 0;">KIKIDULT</h1>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 16px;">주문이 완료되었습니다 🎉</h2>

        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px; opacity: 0.8;">
          주문번호: <strong>${params.orderNo}</strong>
        </p>

        <div style="background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
          <p style="font-size: 12px; opacity: 0.6; margin: 0 0 8px;">주문 상품</p>
          <p style="font-size: 14px; margin: 0;">${params.itemsSummary}</p>
        </div>

        <div style="background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; opacity: 0.6;">결제 금액 (상품+수수료)</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700;">$${params.totalUsd.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; opacity: 0.6;">예상 배송비 (별도 청구)</td>
              <td style="padding: 4px 0; text-align: right;">$${params.estimatedShippingUsd.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; line-height: 1.6; margin: 0 0 8px; opacity: 0.8;">
          실제 배송비는 포장 후 중량 측정하여 확정되며,<br/>
          확정 시 별도 이메일로 결제 링크를 보내드립니다.
        </p>
      </div>

      <div style="padding: 16px 0; border-top: 1px solid #eee; font-size: 11px; opacity: 0.5;">
        <p style="margin: 0;">Kikidult — TCG Market<br/>문의: ${process.env.GMAIL_USER}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Kikidult" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: `[Kikidult] 주문 확인 - ${params.orderNo}`,
    html,
  });
}
