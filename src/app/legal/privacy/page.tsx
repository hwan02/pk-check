export const revalidate = 86400; // 1일

export const metadata = {
  title: "개인정보처리방침 · Kikidult",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10 article-body">
      <h1>개인정보처리방침</h1>
      <p className="opacity-60 text-sm">최종 업데이트: 2026-05-15</p>

      <p>
        Kikidult(이하 &quot;회사&quot;)는 이용자의 개인정보를 중요시하며,
        「개인정보 보호법」 및 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등
        관련 법령을 준수합니다. 본 개인정보처리방침은 회사가 제공하는 트레이딩 카드
        전자상거래 서비스(이하 &quot;서비스&quot;)에 적용됩니다.
      </p>

      <h2>1. 총칙</h2>
      <p>
        가. 개인정보란 생존하는 개인에 관한 정보로서 해당 개인을 식별할 수 있는
        정보(다른 정보와 결합하여 식별 가능한 정보 포함)를 말합니다.
      </p>
      <p>
        나. 회사는 개인정보처리방침을 홈페이지에 공개하여 이용자가 언제든 확인할 수
        있도록 하며, 법령 변경 및 서비스 운영 필요에 따라 개정할 수 있습니다.
      </p>

      <h2>2. 수집하는 개인정보 항목 및 이용 목적</h2>
      <p>
        회사는 서비스 제공을 위해 필요한 최소한의 정보만을 수집하며, 수집·이용 목적
        이외의 용도로 이용하거나 이용자의 동의 없이 제3자에게 제공하지 않습니다.
      </p>
      <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", marginTop: "12px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "8px 4px" }}>수집·이용 목적</th>
            <th style={{ textAlign: "left", padding: "8px 4px" }}>수집 항목</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: "12px" }}>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 4px" }}>회원가입 및 본인 확인</td>
            <td style={{ padding: "8px 4px" }}>이메일, 이름, 비밀번호(또는 Google OAuth 식별자)</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 4px" }}>주문·결제·배송·환불</td>
            <td style={{ padding: "8px 4px" }}>수령인명, 연락처, 배송주소, 우편번호, 국가, 결제수단 정보(카드 브랜드·끝 4자리)</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 4px" }}>해외배송 통관 절차</td>
            <td style={{ padding: "8px 4px" }}>개인통관고유부호(P + 12자리), 수령인 영문명</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 4px" }}>고객 문의·분쟁 처리, 공지 전달</td>
            <td style={{ padding: "8px 4px" }}>이메일, 전화번호</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 4px" }}>부정 이용 방지, 서비스 개선</td>
            <td style={{ padding: "8px 4px" }}>IP주소, 쿠키, 브라우저 종류, 접속 기록, 서비스 이용 기록</td>
          </tr>
        </tbody>
      </table>

      <h2>3. 개인정보의 보유 및 이용 기간</h2>
      <p>
        회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 따라 아래 기간 동안 보관합니다.
      </p>
      <ul>
        <li>계약 또는 청약철회 등에 관한 기록: <strong>5년</strong> (전자상거래법)</li>
        <li>대금결제 및 재화 공급에 관한 기록: <strong>5년</strong> (전자상거래법)</li>
        <li>소비자 불만 또는 분쟁처리 기록: <strong>3년</strong> (전자상거래법)</li>
        <li>본인확인에 관한 기록: <strong>6개월</strong> (정보통신망법)</li>
        <li>웹사이트 방문기록(자동생성정보): <strong>3개월</strong> (통신비밀보호법)</li>
      </ul>

      <h2>4. 개인정보의 제3자 제공</h2>
      <p>
        원칙적으로 이용자의 동의 없이 제3자에게 제공하지 않습니다. 다만, 다음의 경우 최소한의 정보를 제공합니다.
      </p>
      <ul>
        <li><strong>관세청:</strong> 개인통관고유부호, 수령인, 주소, 품목·가격 (수입통관 신고)</li>
        <li><strong>배송사</strong> (우체국 EMS/K-Packet 등): 수령인, 연락처, 배송주소</li>
        <li><strong>결제 PG</strong> (PayPal): 결제에 필요한 최소 정보</li>
        <li>법령에 의해 수사기관 등의 요청이 있는 경우</li>
      </ul>

      <h2>5. 개인정보 처리 위탁</h2>
      <p>
        회사는 서비스 제공을 위해 아래와 같이 개인정보를 위탁하고 있으며, 위탁 시 개인정보가 안전하게 관리되도록 필요한 조치를 취합니다.
      </p>
      <ul>
        <li><strong>PayPal:</strong> 결제 처리</li>
        <li><strong>우체국(한국우편):</strong> 국제우편 배송</li>
        <li><strong>Vercel / Supabase:</strong> 서비스 호스팅 및 데이터 저장</li>
        <li><strong>Google (Gmail):</strong> 주문 안내 이메일 발송</li>
      </ul>

      <h2>6. 쿠키의 운용 및 활용</h2>
      <p>
        회사는 이용자의 편의를 위해 쿠키를 사용합니다. 쿠키는 서버가 브라우저에 보내는 소량의 데이터로, 로그인 유지·장바구니 등에 활용됩니다. 이용자는 브라우저 설정을 통해 쿠키를 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.
      </p>

      <h2>7. 이용자의 권리</h2>
      <p>
        이용자는 언제든지 개인정보의 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.
        My Page › 회원정보 수정에서 직접 변경하거나, 아래 고객센터로 요청해 주세요.
      </p>

      <h2>8. 개인정보의 기술적·관리적 보호 조치</h2>
      <ul>
        <li>비밀번호 암호화 저장 (Supabase Auth bcrypt)</li>
        <li>SSL/TLS 암호화 통신</li>
        <li>개인정보 접근 권한 최소화</li>
        <li>정기적인 보안 점검</li>
      </ul>

      <h2>9. 개인정보 보호 책임자</h2>
      <p>
        개인정보 처리에 관한 업무를 총괄하는 개인정보 보호 책임자는 다음과 같습니다.
      </p>
      <ul>
        <li><strong>상호:</strong> Kikidult</li>
        <li><strong>이메일:</strong> kikidult.help@gmail.com</li>
        <li><strong>웹사이트:</strong> kikidult.vercel.app</li>
      </ul>

      <h2>10. 고지의 의무</h2>
      <p>
        본 개인정보처리방침은 법령, 정책 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시 최소 7일 전 사이트에 공지합니다. 이용자 권리에 중요한 변경이 있을 경우 최소 30일 전에 고지합니다.
      </p>

      <hr />
      <p className="opacity-60 text-sm">
        본 방침은 2026년 5월 15일부터 시행합니다.
      </p>
    </article>
  );
}
