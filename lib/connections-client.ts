import type { ApiEnvelope } from "./auth-types";
import type { MatchPerson } from "./matching-client";

export type ConnectionStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type Connection = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: ConnectionStatus;
  requestedAt: string;
  respondedAt?: string | null;
  requester: MatchPerson;
  addressee: MatchPerson;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/connections${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Unable to connect to the server. Check that the backend is running.");
  }
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Request failed");
  }
  return body.data;
}

export const connectionsApi = {
  list: (status?: ConnectionStatus) => request<Connection[]>(status ? `?status=${status}` : ""),
  request: (targetId: string) => request<Connection>("", { method: "POST", body: JSON.stringify({ targetId }) }),
  respond: (connectionId: string, accept: boolean) => request<Connection>(`/${encodeURIComponent(connectionId)}/respond`, { method: "POST", body: JSON.stringify({ accept }) }),
  cancel: (connectionId: string) => request<Connection>(`/${encodeURIComponent(connectionId)}/cancel`, { method: "POST", body: JSON.stringify({}) }),
  remove: (connectionId: string) => request<Connection>(`/${encodeURIComponent(connectionId)}`, { method: "DELETE" }),
};
