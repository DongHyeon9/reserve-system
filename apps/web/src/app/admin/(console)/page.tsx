export const metadata = { title: "관리자 대시보드" };

export default function AdminDashboardPage() {
  return (
    <div className="admin-page-head">
      <div>
        <h1>대시보드</h1>
        <p>운영 지표는 관리자 서브컨텍스트(SC-005A)에서 연결합니다.</p>
      </div>
    </div>
  );
}
