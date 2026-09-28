import type { ApiEnvelope } from "./auth-types";

export type MoodValue = "VERY_LOW" | "LOW" | "NEUTRAL" | "GOOD" | "GREAT";
export type RoutineFrequency = "DAILY" | "WEEKLY" | "CUSTOM";
export type SuggestionStatus = "PENDING" | "SEEN" | "ACCEPTED" | "DISMISSED";
export type MemoryCategory = "PREFERENCE" | "GOAL" | "WELLBEING" | "CONTEXT";

export type MoodCheckIn = {
  id: string;
  mood: MoodValue;
  energyLevel: number;
  note?: string | null;
  recordedAt: string;
};

export type HabitCompletion = {
  id: string;
  localDate: string;
  value: number;
  note?: string | null;
  completedAt: string;
};

export type HabitRoutine = {
  id: string;
  name: string;
  frequency: RoutineFrequency;
  schedule: Record<string, unknown>;
  timezone: string;
  targetValue: number;
  unit: string;
  isActive: boolean;
  startsOn: string;
  completions: HabitCompletion[];
};

export type MascotSuggestion = {
  id: string;
  type: "CHECK_IN" | "HABIT" | "SOCIAL" | "CONTENT";
  title: string;
  content: string;
  reason?: string | null;
  payload?: Record<string, unknown> | null;
  status: SuggestionStatus;
  createdAt: string;
};

export type MascotMemory = {
  id: string;
  category: MemoryCategory;
  summary: string;
  sourceType: "USER_EXPLICIT" | "CONVERSATION" | "SYSTEM_INFERRED";
  confidence: number;
  createdAt: string;
  expiresAt?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/wellbeing${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy.");
  }
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Yêu cầu không thành công");
  }
  return body.data;
}

export const wellbeingApi = {
  moods: (limit = 30) => request<MoodCheckIn[]>(`/moods?limit=${limit}`),
  checkIn: (mood: MoodValue, energyLevel: number, note?: string) => request<MoodCheckIn>("/moods", { method: "POST", body: JSON.stringify({ mood, energyLevel, ...(note ? { note } : {}) }) }),
  routines: (activeOnly = false) => request<HabitRoutine[]>(`/routines?activeOnly=${activeOnly}`),
  createRoutine: (data: { name: string; frequency: RoutineFrequency; schedule: Record<string, unknown>; timezone: string; targetValue?: number; unit?: string; startsOn: string }) => request<HabitRoutine>("/routines", { method: "POST", body: JSON.stringify(data) }),
  completeRoutine: (routineId: string, localDate: string, value?: number, note?: string) => request<HabitCompletion>(`/routines/${encodeURIComponent(routineId)}/completion`, { method: "PUT", body: JSON.stringify({ localDate, ...(value ? { value } : {}), ...(note ? { note } : {}) }) }),
  setRoutineActive: (routineId: string, isActive: boolean) => request<{ isActive: boolean }>(`/routines/${encodeURIComponent(routineId)}/active`, { method: "PUT", body: JSON.stringify({ isActive }) }),
  suggestions: () => request<MascotSuggestion[]>("/suggestions"),
  refreshSuggestions: () => request<MascotSuggestion[]>("/suggestions/refresh", { method: "POST", body: "{}" }),
  respondSuggestion: (suggestionId: string, status: SuggestionStatus) => request<{ status: SuggestionStatus }>(`/suggestions/${encodeURIComponent(suggestionId)}`, { method: "PUT", body: JSON.stringify({ status }) }),
  memories: () => request<MascotMemory[]>("/memories"),
  createMemory: (category: MemoryCategory, summary: string, consent: true) => request<MascotMemory>("/memories", { method: "POST", body: JSON.stringify({ category, summary, consent }) }),
  revokeMemory: (memoryId: string) => request<{ revoked: true }>(`/memories/${encodeURIComponent(memoryId)}`, { method: "DELETE" }),
};
