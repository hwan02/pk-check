import Link from "next/link";

// 사업자 정보 — 실제 값으로 교체 필요
const BUSINESS = {
  name: "Kikidult",
  ceo: "OOO",
  bizNo: "000-00-00000",
  ecommerceNo: "제0000-서울-0000호",
  address: "서울특별시 OO구 OO로 OOO",
  contactEmail: "support@kikidult.com",
  contactPhone: "02-0000-0000",
  hosting: "Vercel · Supabase",
};

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--card-bg)]">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-8">
          {/* 브랜드 + 약관 */}
          <div>
            <p
              className="text-xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-brand), sans-serif", letterSpacing: "-0.04em" }}
            >
              KIKIDULT
            </p>
            <p className="text-xs opacity-60 mt-2 leading-relaxed">
              포켓몬 · 원피스 트레이딩 카드 마켓
              <br />
              해외 카드 직판 / 구매대행 서비스
            </p>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs">
              <li>
                <Link
                  href="/legal/privacy"
                  className="font-semibold opacity-80 hover:opacity-100"
                >
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="opacity-70 hover:opacity-100"
                >
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/content" className="opacity-70 hover:opacity-100">
                  매거진
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS.contactEmail}`}
                  className="opacity-70 hover:opacity-100"
                >
                  고객센터
                </a>
              </li>
            </ul>
          </div>

          {/* 사업자 정보 */}
          <div className="text-[11px] opacity-70 leading-relaxed">
            <p className="text-xs font-semibold opacity-90 mb-2">사업자 정보</p>
            <dl className="grid grid-cols-[64px_1fr] gap-y-1">
              <dt className="opacity-60">상호</dt>
              <dd>{BUSINESS.name}</dd>
              <dt className="opacity-60">대표</dt>
              <dd>{BUSINESS.ceo}</dd>
              <dt className="opacity-60">사업자</dt>
              <dd>{BUSINESS.bizNo}</dd>
              <dt className="opacity-60">통신판매</dt>
              <dd>{BUSINESS.ecommerceNo}</dd>
              <dt className="opacity-60">주소</dt>
              <dd>{BUSINESS.address}</dd>
            </dl>
          </div>

          {/* 고객센터 */}
          <div className="text-[11px] opacity-70 leading-relaxed">
            <p className="text-xs font-semibold opacity-90 mb-2">고객센터</p>
            <dl className="grid grid-cols-[64px_1fr] gap-y-1">
              <dt className="opacity-60">이메일</dt>
              <dd>
                <a
                  href={`mailto:${BUSINESS.contactEmail}`}
                  className="hover:opacity-100"
                >
                  {BUSINESS.contactEmail}
                </a>
              </dd>
              <dt className="opacity-60">전화</dt>
              <dd>{BUSINESS.contactPhone}</dd>
              <dt className="opacity-60">운영시간</dt>
              <dd>평일 10:00 – 18:00 (KST)</dd>
              <dt className="opacity-60">호스팅</dt>
              <dd className="opacity-80">{BUSINESS.hosting}</dd>
            </dl>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mt-8 pt-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <p className="text-[11px] opacity-50">
            © {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
          </p>
          <p className="text-[11px] opacity-50">
            결제수단: PayPal · Visa · Master · AMEX
          </p>
        </div>
      </div>
    </footer>
  );
}
