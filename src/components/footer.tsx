import Link from "next/link";

// 사업자 정보
const BUSINESS = {
  name: "Kikidult",
  ceo: "서승환",
  bizNo: "217-62-00760",
  ecommerceNo: "", // 신고 준비 중
  address: "서울특별시 서대문구 성산로18길 18-8, 2층",
  contactEmail: "kikidult.help@gmail.com",
  contactPhone: "070-8064-4216",
  privacyOfficer: "서승환",
  privacyEmail: "kikidult.help@gmail.com",
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
              {BUSINESS.ecommerceNo && (
                <>
                  <dt className="opacity-60">통신판매</dt>
                  <dd>{BUSINESS.ecommerceNo}</dd>
                </>
              )}
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
            </dl>
          </div>
        </div>

        {/* 개인정보처리방침 안내 */}
        <div className="border-t border-[var(--border)] mt-8 pt-5 text-[11px] opacity-70 leading-relaxed space-y-1">
          <p>
            <strong className="opacity-90">개인정보보호책임자</strong> ·{" "}
            {BUSINESS.privacyOfficer} (
            <a
              href={`mailto:${BUSINESS.privacyEmail}`}
              className="underline underline-offset-2 hover:opacity-100"
            >
              {BUSINESS.privacyEmail}
            </a>
            )
          </p>
          <p className="opacity-80">
            회원의 개인정보는 관련 법령 및{" "}
            <Link
              href="/legal/privacy"
              className="underline underline-offset-2 font-semibold opacity-100 hover:opacity-100"
            >
              개인정보처리방침
            </Link>
            에 따라 안전하게 보호됩니다. {BUSINESS.name}은(는) 통신판매중개자이자 해외 구매대행
            서비스 제공자로서, 통관 시 부과되는 관세·부가세는 회원이 부담합니다.
          </p>
        </div>

        <div className="border-t border-[var(--border)] mt-5 pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <p className="text-[11px] opacity-50">
            © {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
          </p>
          <p className="text-[11px] opacity-50">결제수단: PayPal</p>
        </div>
      </div>
    </footer>
  );
}
