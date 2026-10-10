import { notFound } from "next/navigation";
import { PopupDetailView } from "@/components/PopupDetailView";
import { ApiError, apiFetch } from "@/lib/api";
import type { PopupDetail } from "@/lib/types";

export default async function PopupDetailPage({ params }: { params: Promise<{ popupId: string }> }) {
  const { popupId } = await params;
  if (!/^\d{1,18}$/.test(popupId)) notFound();

  let popup: PopupDetail;
  try {
    popup = await apiFetch<PopupDetail>(`/api/popups/${popupId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className="container page-hero">
        <h1>팝업 정보를 불러오지 못했습니다</h1>
        <p className="lead">{error instanceof ApiError ? error.message : "잠시 후 다시 시도해 주세요."}</p>
      </div>
    );
  }
  return <PopupDetailView popup={popup} />;
}
