// Mirrors the Spring API contract (apps/api/src/test/resources/contract/openapi.json). Times are ISO-8601 UTC strings.

export type ReservationStatus = "WAITING" | "OPEN" | "SOLD_OUT" | "CLOSED";
export type BookingStatus = "CONFIRMED" | "CANCELLED" | "CHECKED_IN";
export type ArtTheme = "red" | "blue" | "green" | "orange" | "purple" | "yellow";

export type ApiProblem = { status: number; code: string; detail: string; errors?: { field: string; message: string }[] };

export type PageResponse<T> = { items: T[]; page: number; size: number; totalItems: number; totalPages: number };

export type PopupSummary = {
  id: number;
  title: string;
  label: string;
  area: string;
  category: string;
  artTheme: ArtTheme;
  startsOn: string;
  endsOn: string;
  opensAt: string;
  reservationStatus: ReservationStatus;
  remainingSeats: number;
};

export type Slot = { id: number; startsAt: string; endsAt: string; capacity: number; remaining: number; reservable: boolean };

export type PopupDetail = PopupSummary & {
  summary: string;
  description: string;
  notice: string | null;
  address: string;
  operatingHours: string;
  visitMinutes: number;
  maxPartySize: number;
  cancelCutoffHours: number;
  closesAt: string | null;
  serverTime: string;
  slots: Slot[];
};

export type Reservation = {
  id: string;
  code: string;
  status: BookingStatus;
  popup: { id: number; title: string; label: string; area: string; address: string; artTheme: ArtTheme };
  slot: { id: number; startsAt: string; endsAt: string };
  partySize: number;
  contactName: string;
  contactPhoneMasked: string;
  contactEmail: string;
  createdAt: string;
  cancelledAt: string | null;
  cancellableUntil: string;
  cancellable: boolean;
};

export type PopupFacets = { areas: string[]; categories: string[] };

export type ReservationList = PageResponse<Reservation> & { counts: { upcoming: number; past: number; cancelled: number } };

export type AdminDashboard = {
  date: string;
  serverTime: string;
  kpis: {
    todayReservations: number;
    yesterdayReservations: number;
    reservationDeltaPercent: number | null;
    todayVisits: number;
    expectedVisits: number;
    checkInRatePercent: number | null;
    todaySlots: number;
    soldOutSlots: number;
    todayCancellations: number;
    cancelRatePercent: number | null;
  };
  todaySlots: { slotId: number; popupId: number; popupTitle: string; startsAt: string; capacity: number; reserved: number }[];
  alerts: { type: "SLOT_NEARLY_FULL" | "OPENING_SOON"; popupId: number; popupTitle: string; slotId: number | null; at: string; remaining: number | null }[];
};

export type PublishStatus = "DRAFT" | "PUBLISHED" | "ENDED";

export type AdminPopupRow = {
  id: number;
  title: string;
  area: string;
  category: string;
  startsOn: string;
  endsOn: string;
  publishStatus: PublishStatus;
  reservationStatus: ReservationStatus;
  opensAt: string;
  slotCount: number;
  activeReservations: number;
  updatedAt: string;
};

export type AdminPopup = AdminPopupRow & {
  label: string;
  summary: string;
  description: string;
  notice: string | null;
  address: string;
  operatingHours: string;
  visitMinutes: number;
  artTheme: ArtTheme;
  closesAt: string | null;
  manuallyClosed: boolean;
  maxPartySize: number;
  cancelCutoffHours: number;
};

export type AdminSlot = { id: number; startsAt: string; endsAt: string; capacity: number; reserved: number; remaining: number };
