export type BookingDraftType = "transport" | "hotel";

export interface BookingDraft {
  id: string;
  type: BookingDraftType;
  item: Record<string, unknown>;
  details: {
    tripId: string;
    date?: string;
    passengers?: number;
  };
  status: "draft" | "confirmed";
  createdAt: number;
  expiresAt: number;
}

const DRAFT_KEY_PREFIX = "voyage_booking_draft_";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createBookingDraft(
  input: Omit<BookingDraft, "id" | "status" | "createdAt" | "expiresAt">
): BookingDraft {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createdAt = Date.now();
  const draft: BookingDraft = {
    ...input,
    id,
    status: "draft",
    createdAt,
    expiresAt: createdAt + DRAFT_TTL_MS,
  };
  localStorage.setItem(`${DRAFT_KEY_PREFIX}${id}`, JSON.stringify(draft));
  return draft;
}

export function getBookingDraft(id: string): BookingDraft | null {
  const key = `${DRAFT_KEY_PREFIX}${id}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  let draft: BookingDraft;
  try {
    draft = JSON.parse(stored) as BookingDraft;
  } catch (error) {
    console.error("[booking] stored draft could not be read", error);
    localStorage.removeItem(key);
    return null;
  }

  if (
    draft.id !== id ||
    (draft.type !== "transport" && draft.type !== "hotel") ||
    !draft.item ||
    !draft.details?.tripId ||
    typeof draft.expiresAt !== "number"
  ) {
    localStorage.removeItem(key);
    return null;
  }
  if (draft.expiresAt <= Date.now()) {
    localStorage.removeItem(key);
    return null;
  }
  return draft;
}

export function updateBookingDraft(draft: BookingDraft): void {
  localStorage.setItem(`${DRAFT_KEY_PREFIX}${draft.id}`, JSON.stringify(draft));
}
