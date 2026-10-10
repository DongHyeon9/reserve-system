import Link from "next/link";

export default function CustomerNotFound() {
  return (
    <div className="container page-hero">
      <h1>페이지를 찾을 수 없습니다</h1>
      <p className="lead">요청하신 정보가 없거나 접근할 수 없습니다.</p>
      <Link className="btn btn-primary" href="/popups">팝업 둘러보기</Link>
    </div>
  );
}
