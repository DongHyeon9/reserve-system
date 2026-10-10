import Link from "next/link";

export default function CustomerNotFound() {
  return (
    <div className="container page-hero">
      <h1>페이지를 찾을 수 없습니다</h1>
      <p className="lead">요청하신 팝업이 없거나 아직 공개되지 않았습니다.</p>
      <Link className="btn btn-primary" href="/popups">팝업 둘러보기</Link>
    </div>
  );
}
