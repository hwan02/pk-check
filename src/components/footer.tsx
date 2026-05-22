import Link from "next/link";

// 사업자 정보
const BUSINESS = {
  name: "포포스테이",
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
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* 한 줄: 브랜드 + 링크들 + 사업자정보 토글 + 카피라이트 */}
        <details className="group">
          <summary className="cursor-pointer list-none select-none flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span
              className="text-sm font-black tracking-tight"
              style={{ fontFamily: "var(--font-brand), sans-serif", letterSpacing: "-0.04em" }}
            >
              KIKIDULT
            </span>
            <Link
              href="/legal/privacy"
              className="opacity-70 hover:opacity-100"            >
              개인정보처리방침
            </Link>
            <Link
              href="/legal/terms"
              className="opacity-70 hover:opacity-100"            >
              이용약관
            </Link>
            <a
              href={`mailto:${BUSINESS.contactEmail}`}
              className="opacity-70 hover:opacity-100"            >
              고객센터
            </a>
            <a
              href="https://www.instagram.com/kiki_dult"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100"            >
              Instagram
            </a>
            <span className="inline-flex items-center gap-1 opacity-70 hover:opacity-100">
              사업자 정보
              <svg
                className="opacity-60 transition-transform group-open:rotate-180"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
            <span className="ml-auto text-[10px] opacity-50">
              © {new Date().getFullYear()} {BUSINESS.name} · PayPal
            </span>
          </summary>

          {/* 펼침 영역 */}
          <div className="mt-3 pt-3 border-t border-[var(--border)] text-[11px] opacity-70 leading-relaxed grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <dl className="grid grid-cols-[72px_1fr] gap-y-1">
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
            <dl className="grid grid-cols-[72px_1fr] gap-y-1">
              <dt className="opacity-60">이메일</dt>
              <dd>
                <a href={`mailto:${BUSINESS.contactEmail}`} className="hover:opacity-100">
                  {BUSINESS.contactEmail}
                </a>
              </dd>
              <dt className="opacity-60">전화</dt>
              <dd>{BUSINESS.contactPhone}</dd>
              <dt className="opacity-60">운영시간</dt>
              <dd>평일 10:00 – 18:00 (KST)</dd>
              <dt className="opacity-60">개인정보</dt>
              <dd>
                {BUSINESS.privacyOfficer} ·{" "}
                <a
                  href={`mailto:${BUSINESS.privacyEmail}`}
                  className="underline underline-offset-2 hover:opacity-100"
                >
                  {BUSINESS.privacyEmail}
                </a>
              </dd>
            </dl>
            <p className="sm:col-span-2 opacity-60">
              {BUSINESS.name}은(는) 통신판매중개자이자 해외 구매대행 서비스 제공자로서, 통관 시
              부과되는 관세·부가세는 회원이 부담합니다. 회원의 개인정보는{" "}
              <Link
                href="/legal/privacy"
                className="underline underline-offset-2 hover:opacity-100"
              >
                개인정보처리방침
              </Link>
              에 따라 보호됩니다.
            </p>
          </div>
        </details>
      </div>
    </footer>
  );
}
