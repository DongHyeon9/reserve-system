import Link from "next/link";
import { AdminPopupForm } from "@/components/AdminPopupForm";
import { popupToValues } from "@/lib/admin-popups";
import { savePopup } from "../actions";

export const metadata = { title: "새 팝업" };

export default function NewPopupPage() {
  return (
    <>
      <div className="admin-page-head">
        <div>
          <nav className="breadcrumbs" aria-label="현재 위치">
            <span><Link href="/admin/popups">팝업 관리</Link></span>
            <span aria-current="page">새 팝업</span>
          </nav>
          <h1>새 팝업</h1>
          <p>고객 화면에 노출될 정보와 운영 정책을 설정합니다.</p>
        </div>
      </div>
      <AdminPopupForm action={savePopup} initial={popupToValues(null)} />
    </>
  );
}
