"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  Compass,
  HeartHandshake,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Settings2,
  Sparkles,
  UserCheck,
  UserMinus,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import { connectionsApi, type Connection } from "@/lib/connections-client";
import {
  matchingApi,
  type MatchFeedbackType,
  type MatchPerson,
  type MatchReason,
  type MatchRecommendation,
  type MatchingPreference,
} from "@/lib/matching-client";

type DiscoverTab = "matches" | "requests" | "connections";

const fallbackAvatar = "/assets/home/avatar-01.png";
const defaultPreference: MatchingPreference = {
  enabled: true,
  minAge: 18,
  maxAge: 70,
  maxDistanceKm: 100,
  preferredGoals: [],
  weights: { interests: 0.5, habits: 0.2, goals: 0.3 },
};

function otherPerson(connection: Connection, userId: string) {
  return connection.requesterId === userId ? connection.addressee : connection.requester;
}

function reasonText(reason: MatchReason) {
  if (reason.code === "SHARED_INTERESTS") return `${reason.count} sở thích chung`;
  if (reason.code === "SHARED_HABITS") return `${reason.count} thói quen tương đồng`;
  if (reason.code === "MATCHED_GOALS") return "Cùng mục tiêu kết nối";
  return "Có điểm chung phù hợp";
}

function scorePercent(score: number | string) {
  const numeric = Number(score);
  return Math.max(0, Math.min(100, Math.round((Number.isFinite(numeric) ? numeric : 0) * 100)));
}

export default function MatchingHub() {
  const [user, setUser] = useState<WebUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [tab, setTab] = useState<DiscoverTab>("matches");
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [preference, setPreference] = useState<MatchingPreference>(defaultPreference);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async (currentUser: WebUser) => {
    setLoading(true);
    setError("");
    try {
      const [savedPreference, items, links] = await Promise.all([
        matchingApi.preference(),
        matchingApi.recommendations(),
        connectionsApi.list(),
      ]);
      setPreference(savedPreference ? {
        ...defaultPreference,
        ...savedPreference,
        preferredGoals: savedPreference.preferredGoals ?? [],
        weights: savedPreference.weights ?? defaultPreference.weights,
      } : defaultPreference);
      setRecommendations(items);
      setConnections(links);
      setUser(currentUser);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu khám phá");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    webAuth.me()
      .then((currentUser) => {
        if (active) return loadData(currentUser);
      })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setAuthResolved(true); });
    return () => { active = false; };
  }, [loadData]);

  const incoming = useMemo(() => connections.filter((item) => item.status === "PENDING" && item.addresseeId === user?.id), [connections, user?.id]);
  const outgoing = useMemo(() => connections.filter((item) => item.status === "PENDING" && item.requesterId === user?.id), [connections, user?.id]);
  const accepted = useMemo(() => connections.filter((item) => item.status === "ACCEPTED"), [connections]);

  const refreshMatches = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    setNotice("");
    try {
      const result = await matchingApi.refresh();
      setRecommendations(result.items);
      setNotice(result.items.length
        ? `BeeBuddy đã tìm thấy ${result.items.length} gợi ý mới cho bạn.`
        : "Chưa có hồ sơ mới phù hợp. Hãy cập nhật hồ sơ hoặc điều chỉnh tiêu chí.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể làm mới gợi ý");
    } finally {
      setRefreshing(false);
    }
  };

  const sendFeedback = async (recommendation: MatchRecommendation, type: MatchFeedbackType) => {
    let reasons: Record<string, unknown> | undefined;
    if (type === "BLOCK" && !window.confirm("Chặn người này và không hiển thị lại trong gợi ý?")) return;
    if (type === "REPORT") {
      const reason = window.prompt("Lý do báo cáo hồ sơ này:", "Hồ sơ không phù hợp")?.trim();
      if (!reason) return;
      reasons = { reason };
    }
    setActionId(recommendation.id);
    setError("");
    setNotice("");
    try {
      await matchingApi.feedback(recommendation.id, type, reasons);
      setRecommendations((current) => current.filter((item) => item.id !== recommendation.id));
      if (type === "CONNECT") {
        setNotice(`Đã gửi lời mời kết nối tới ${recommendation.candidateUser.profile?.fullName || "người bạn mới"}.`);
        setConnections(await connectionsApi.list());
      } else if (type === "REPORT") {
        setNotice("BeeBuddy đã nhận báo cáo và sẽ xem xét hồ sơ này.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật gợi ý");
    } finally {
      setActionId(null);
    }
  };

  const respond = async (connection: Connection, accept: boolean) => {
    setActionId(connection.id);
    setError("");
    try {
      const updated = await connectionsApi.respond(connection.id, accept);
      setConnections((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(accept ? "Hai bạn đã kết nối với nhau." : "Đã từ chối lời mời kết nối.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể phản hồi lời mời");
    } finally {
      setActionId(null);
    }
  };

  const cancelOrRemove = async (connection: Connection) => {
    const removing = connection.status === "ACCEPTED";
    if (removing && !window.confirm("Bạn chắc chắn muốn ngắt kết nối này?")) return;
    setActionId(connection.id);
    setError("");
    try {
      const updated = removing
        ? await connectionsApi.remove(connection.id)
        : await connectionsApi.cancel(connection.id);
      setConnections((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(removing ? "Đã ngắt kết nối." : "Đã hủy lời mời kết nối.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật kết nối");
    } finally {
      setActionId(null);
    }
  };

  const savePreference = async (event: FormEvent) => {
    event.preventDefault();
    setActionId("preferences");
    setError("");
    try {
      const saved = await matchingApi.savePreference({
        enabled: preference.enabled,
        minAge: preference.minAge || undefined,
        maxAge: preference.maxAge || undefined,
        maxDistanceKm: preference.maxDistanceKm || undefined,
        preferredGoals: preference.preferredGoals,
        weights: preference.weights,
      });
      setPreference(saved);
      setShowPreferences(false);
      setNotice("Đã lưu tiêu chí kết nối. Hãy làm mới để nhận gợi ý mới.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu tiêu chí");
    } finally {
      setActionId(null);
    }
  };

  if (!authResolved) {
    return <div className="bb-match-page-state"><LoaderCircle className="bb-spin" size={30} /> Đang chuẩn bị không gian khám phá...</div>;
  }

  if (!user) {
    return (
      <main className="bb-match-guest">
        <Sparkles size={42} />
        <h1>Khám phá người đồng điệu</h1>
        <p>Đăng nhập để BeeBuddy đề xuất những người có cùng sở thích, thói quen và mục tiêu kết nối.</p>
        <Link href="/login">Đăng nhập để bắt đầu</Link>
      </main>
    );
  }

  return (
    <main className="bb-match-hub">
      <section className="bb-match-hero">
        <div><span><Sparkles size={16} /> Kết nối thông minh</span><h1>Khám phá người đồng điệu</h1><p>Gợi ý dựa trên sở thích, thói quen và mục tiêu mà bạn đã chia sẻ với BeeBuddy.</p></div>
        <div className="bb-match-hero-actions">
          <button type="button" onClick={() => setShowPreferences(true)}><Settings2 size={18} /> Tiêu chí</button>
          <button type="button" className="is-primary" disabled={refreshing || !preference.enabled} onClick={() => void refreshMatches()}>{refreshing ? <LoaderCircle className="bb-spin" size={18} /> : <RefreshCw size={18} />} Làm mới gợi ý</button>
        </div>
      </section>

      <section className="bb-match-shell">
        <div className="bb-match-tabs" role="tablist">
          <button className={tab === "matches" ? "is-active" : ""} onClick={() => setTab("matches")}><Compass size={17} /> Gợi ý <span>{recommendations.length}</span></button>
          <button className={tab === "requests" ? "is-active" : ""} onClick={() => setTab("requests")}><UserRoundPlus size={17} /> Lời mời {incoming.length > 0 && <span>{incoming.length}</span>}</button>
          <button className={tab === "connections" ? "is-active" : ""} onClick={() => setTab("connections")}><Users size={17} /> Kết nối <span>{accepted.length}</span></button>
        </div>

        {(error || notice) && <div className={`bb-match-alert ${error ? "is-error" : "is-success"}`}>{error || notice}</div>}

        {loading ? (
          <div className="bb-match-empty"><LoaderCircle className="bb-spin" size={28} /> Đang tải dữ liệu...</div>
        ) : tab === "matches" ? (
          recommendations.length ? <div className="bb-match-grid">{recommendations.map((item) => <MatchCard key={item.id} item={item} pending={actionId === item.id} onFeedback={sendFeedback} />)}</div>
          : <EmptyMatches enabled={preference.enabled} refreshing={refreshing} onRefresh={() => void refreshMatches()} />
        ) : tab === "requests" ? (
          <div className="bb-connection-sections">
            <ConnectionSection title="Lời mời đang chờ bạn" empty="Bạn chưa có lời mời mới.">
              {incoming.map((item) => <ConnectionRow key={item.id} person={otherPerson(item, user.id)} meta="Muốn kết nối với bạn" pending={actionId === item.id} actions={<><button className="is-accept" onClick={() => void respond(item, true)}><Check size={16} /> Chấp nhận</button><button onClick={() => void respond(item, false)}><X size={16} /> Từ chối</button></>} />)}
            </ConnectionSection>
            <ConnectionSection title="Lời mời bạn đã gửi" empty="Bạn chưa gửi lời mời nào.">
              {outgoing.map((item) => <ConnectionRow key={item.id} person={otherPerson(item, user.id)} meta="Đang chờ phản hồi" pending={actionId === item.id} actions={<button onClick={() => void cancelOrRemove(item)}><X size={16} /> Hủy lời mời</button>} />)}
            </ConnectionSection>
          </div>
        ) : (
          <ConnectionSection title="Những người đã kết nối" empty="Chưa có kết nối nào. Hãy khám phá những gợi ý phù hợp.">
            {accepted.map((item) => { const person = otherPerson(item, user.id); return <ConnectionRow key={item.id} person={person} meta="Đã kết nối" pending={actionId === item.id} actions={<><Link href={`/messages?user=${encodeURIComponent(person.id)}`}><HeartHandshake size={16} /> Nhắn tin</Link><button onClick={() => void cancelOrRemove(item)}><UserMinus size={16} /> Ngắt kết nối</button></>} />; })}
          </ConnectionSection>
        )}
      </section>

      {showPreferences && <PreferenceModal preference={preference} pending={actionId === "preferences"} onChange={setPreference} onClose={() => setShowPreferences(false)} onSubmit={savePreference} />}
    </main>
  );
}

function MatchCard({ item, pending, onFeedback }: { item: MatchRecommendation; pending: boolean; onFeedback: (item: MatchRecommendation, type: MatchFeedbackType) => void }) {
  const person = item.candidateUser;
  const reasons = Array.isArray(item.reasons) ? item.reasons as MatchReason[] : [];
  const score = scorePercent(item.score);
  return (
    <article className="bb-match-card">
      <div className="bb-match-card-photo"><img src={person.profile?.avatarUrl || fallbackAvatar} alt={person.profile?.fullName || "Thành viên BeeBuddy"} /><span>{score}% phù hợp</span></div>
      <div className="bb-match-card-body">
        <div className="bb-match-name-row"><div><h2>{person.profile?.fullName || "Thành viên BeeBuddy"}</h2><span>@{person.profile?.username || "beebuddy_member"}</span></div>{person.tier !== "FREE" && <b>{person.tier}</b>}</div>
        <p className="bb-match-location"><MapPin size={15} /> {person.profile?.location || "Chưa chia sẻ vị trí"}</p>
        <div className="bb-match-reasons">{reasons.length ? reasons.map((reason, index) => <span key={`${reason.code}-${index}`}>{reasonText(reason)}</span>) : <span>Hồ sơ có tiềm năng phù hợp</span>}</div>
        <div className="bb-match-card-actions">
          <button aria-label="Bỏ qua" disabled={pending} onClick={() => onFeedback(item, "PASS")}><X size={20} /></button>
          <button className="is-connect" disabled={pending} onClick={() => onFeedback(item, "CONNECT")}>{pending ? <LoaderCircle className="bb-spin" size={18} /> : <HeartHandshake size={18} />} Kết nối</button>
          <button aria-label="Chặn" title="Chặn hồ sơ" disabled={pending} onClick={() => onFeedback(item, "BLOCK")}><Ban size={18} /></button>
        </div>
      </div>
    </article>
  );
}

function EmptyMatches({ enabled, refreshing, onRefresh }: { enabled: boolean; refreshing: boolean; onRefresh: () => void }) {
  return <div className="bb-match-empty"><Sparkles size={36} /><strong>{enabled ? "Chưa có gợi ý đang chờ" : "Tính năng matching đang tắt"}</strong><p>{enabled ? "Làm mới để BeeBuddy tìm những người phù hợp từ dữ liệu hiện tại." : "Mở lại trong phần Tiêu chí để tiếp tục nhận gợi ý."}</p>{enabled && <button type="button" disabled={refreshing} onClick={onRefresh}><RefreshCw size={17} /> Tìm gợi ý mới</button>}<Link href="/account/edit">Cập nhật hồ sơ để tăng độ chính xác</Link></div>;
}

function ConnectionSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="bb-connection-section"><h2>{title}</h2>{hasChildren ? <div className="bb-connection-list">{children}</div> : <div className="bb-match-empty is-small"><Users size={28} /><span>{empty}</span></div>}</section>;
}

function ConnectionRow({ person, meta, pending, actions }: { person: MatchPerson; meta: string; pending: boolean; actions: React.ReactNode }) {
  return <article className={`bb-connection-row ${pending ? "is-pending" : ""}`}><img src={person.profile?.avatarUrl || fallbackAvatar} alt="" /><div className="bb-connection-person"><strong>{person.profile?.fullName || "Thành viên BeeBuddy"}</strong><span>{person.profile?.location || meta}</span>{person.profile?.location && <small>{meta}</small>}</div><div className="bb-connection-actions">{actions}</div></article>;
}

function PreferenceModal({ preference, pending, onChange, onClose, onSubmit }: { preference: MatchingPreference; pending: boolean; onChange: (value: MatchingPreference) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const updateNumber = (key: "minAge" | "maxAge" | "maxDistanceKm", value: string) => onChange({ ...preference, [key]: Number(value) });
  return <div className="bb-match-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="match-preference-title" onMouseDown={onClose}><form className="bb-match-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}><header><div><h2 id="match-preference-title">Tiêu chí kết nối</h2><p>Điều chỉnh phạm vi để gợi ý phù hợp hơn.</p></div><button type="button" onClick={onClose}><X size={20} /></button></header><label className="bb-match-switch"><span><strong>Bật matching</strong><small>Cho phép BeeBuddy tạo gợi ý mới</small></span><input type="checkbox" checked={preference.enabled} onChange={(event) => onChange({ ...preference, enabled: event.target.checked })} /></label><div className="bb-match-form-grid"><label>Tuổi tối thiểu<input type="number" min={18} max={120} value={preference.minAge ?? 18} onChange={(event) => updateNumber("minAge", event.target.value)} /></label><label>Tuổi tối đa<input type="number" min={18} max={120} value={preference.maxAge ?? 70} onChange={(event) => updateNumber("maxAge", event.target.value)} /></label></div><label>Khoảng cách tối đa (km)<input type="number" min={1} max={20000} value={preference.maxDistanceKm ?? 100} onChange={(event) => updateNumber("maxDistanceKm", event.target.value)} /></label><label>Mục tiêu ưu tiên<input value={preference.preferredGoals.join(", ")} onChange={(event) => onChange({ ...preference, preferredGoals: event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20) })} placeholder="Kết bạn, chạy bộ, học tập..." /><small>Phân cách nhiều mục tiêu bằng dấu phẩy.</small></label><footer><button type="button" onClick={onClose}>Hủy</button><button className="is-primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="bb-spin" size={17} /> : <Check size={17} />} Lưu tiêu chí</button></footer></form></div>;
}
