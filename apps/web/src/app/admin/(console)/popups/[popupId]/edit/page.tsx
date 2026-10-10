import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPopupForm, DeletePopup } from "@/components/AdminPopupForm";
import { popupToValues } from "@/lib/admin-popups";
import { ApiError, apiFetch } from "@/lib/api";
import type { AdminPopup } from "@/lib/types";
import { deletePopup, savePopup } from "../../actions";

export const metadata = { title: "팝업 수정" };

export default async function EditPopupPage({
  params,
  searchParams,
}: {
  params: Promise<{ popupId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { popupId } = await params;
  const { saved } = await searchParams;
  if (!/^\d{1,18}$/.test(popupId)) notFound();

  let popup: AdminPopup;
  try {
    popup = await apiFetch<AdminPopup>(`/api/admin/popups/${popupId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    if (!(e instanceof ApiError)) throw e;
    return (
      <div className="notice notice-warning" role="alert">
        <span aria-hidden="true">!</span>
        <span>{e.status >= 500 ? "팝업을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : e.message}</span>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <nav className="breadcrumbs" aria-label="현재 위치">
            <span><Link href="/admin/popups">팝업 관리</Link></span>
            <span aria-current="page">{popup.title}</span>
          </nav>
          <h1>팝업 수정</h1>
          <p>고객 화면에 노출될 정보와 운영 정책을 설정합니다.</p>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-secondary" href={`/admin/popups/${popup.id}/slots`}>회차·정원 관리</Link>
          {popup.publishStatus === "DRAFT" && <DeletePopup popupId={popup.id} action={deletePopup} />}
        </div>
      </div>
      {/* Keyed by updatedAt: after a save the form remounts with the fresh values and concurrency token. */}
      <AdminPopupForm
        key={popup.updatedAt}
        action={savePopup}
        initial={popupToValues(popup)}
        popupId={popup.id}
        expectedUpdatedAt={popup.updatedAt}
        slotCount={popup.slotCount}
        saved={saved === "1"}
      />
    </>
  );
}
