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
  if (reason.code === "SHARED_INTERESTS") return `${reason.count} shared interests`;
  if (reason.code === "SHARED_HABITS") return `${reason.count} similar habits`;
  if (reason.code === "MATCHED_GOALS") return "Shared connection goals";
  return "You have things in common";
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
      setError(cause instanceof Error ? cause.message : "Unable to load discovery data");
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
        ? `BeeBuddy found ${result.items.length} new matches for you.`
        : "No new profiles match yet. Update your profile or adjust your preferences.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to refresh matches");
    } finally {
      setRefreshing(false);
    }
  };

  const sendFeedback = async (recommendation: MatchRecommendation, type: MatchFeedbackType) => {
    let reasons: Record<string, unknown> | undefined;
    if (type === "BLOCK" && !window.confirm("Block this person and remove them from future matches?")) return;
    if (type === "REPORT") {
      const reason = window.prompt("Reason for reporting this profile:", "Inappropriate profile")?.trim();
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
        setNotice(`Connection request sent to ${recommendation.candidateUser.profile?.fullName || "your new friend"}.`);
        setConnections(await connectionsApi.list());
      } else if (type === "REPORT") {
        setNotice("BeeBuddy received your report and will review this profile.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the match");
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
      setNotice(accept ? "You're now connected." : "Connection request declined.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to respond to the request");
    } finally {
      setActionId(null);
    }
  };

  const cancelOrRemove = async (connection: Connection) => {
    const removing = connection.status === "ACCEPTED";
    if (removing && !window.confirm("Are you sure you want to disconnect?")) return;
    setActionId(connection.id);
    setError("");
    try {
      const updated = removing
        ? await connectionsApi.remove(connection.id)
        : await connectionsApi.cancel(connection.id);
      setConnections((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(removing ? "Disconnected." : "Connection request cancelled.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the connection");
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
      setNotice("Connection preferences saved. Refresh to see new matches.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save preferences");
    } finally {
      setActionId(null);
    }
  };

  if (!authResolved) {
    return <div className="bb-match-page-state"><LoaderCircle className="bb-spin" size={30} /> Preparing your discovery space...</div>;
  }

  if (!user) {
    return (
      <main className="bb-match-guest">
        <Sparkles size={42} />
        <h1>Discover like-minded people</h1>
        <p>Sign in to get recommendations based on shared interests, habits, and connection goals.</p>
        <Link href="/login">Sign in to get started</Link>
      </main>
    );
  }

  return (
    <main className="bb-match-hub">
      <section className="bb-match-hero">
        <div><span><Sparkles size={16} /> Smart connections</span><h1>Discover like-minded people</h1><p>Recommendations based on the interests, habits, and goals you shared with BeeBuddy.</p></div>
        <div className="bb-match-hero-actions">
          <button type="button" onClick={() => setShowPreferences(true)}><Settings2 size={18} /> Preferences</button>
          <button type="button" className="is-primary" disabled={refreshing || !preference.enabled} onClick={() => void refreshMatches()}>{refreshing ? <LoaderCircle className="bb-spin" size={18} /> : <RefreshCw size={18} />} Refresh matches</button>
        </div>
      </section>

      <section className="bb-match-shell">
        <div className="bb-match-tabs" role="tablist">
          <button className={tab === "matches" ? "is-active" : ""} onClick={() => setTab("matches")}><Compass size={17} /> Matches <span>{recommendations.length}</span></button>
          <button className={tab === "requests" ? "is-active" : ""} onClick={() => setTab("requests")}><UserRoundPlus size={17} /> Requests {incoming.length > 0 && <span>{incoming.length}</span>}</button>
          <button className={tab === "connections" ? "is-active" : ""} onClick={() => setTab("connections")}><Users size={17} /> Connections <span>{accepted.length}</span></button>
        </div>

        {(error || notice) && <div className={`bb-match-alert ${error ? "is-error" : "is-success"}`}>{error || notice}</div>}

        {loading ? (
          <div className="bb-match-empty"><LoaderCircle className="bb-spin" size={28} /> Loading data...</div>
        ) : tab === "matches" ? (
          recommendations.length ? <div className="bb-match-grid">{recommendations.map((item) => <MatchCard key={item.id} item={item} pending={actionId === item.id} onFeedback={sendFeedback} />)}</div>
          : <EmptyMatches enabled={preference.enabled} refreshing={refreshing} onRefresh={() => void refreshMatches()} />
        ) : tab === "requests" ? (
          <div className="bb-connection-sections">
            <ConnectionSection title="Incoming requests" empty="You have no new requests.">
              {incoming.map((item) => <ConnectionRow key={item.id} person={otherPerson(item, user.id)} meta="Wants to connect with you" pending={actionId === item.id} actions={<><button className="is-accept" onClick={() => void respond(item, true)}><Check size={16} /> Accept</button><button onClick={() => void respond(item, false)}><X size={16} /> Decline</button></>} />)}
            </ConnectionSection>
            <ConnectionSection title="Requests you sent" empty="You haven't sent any requests.">
              {outgoing.map((item) => <ConnectionRow key={item.id} person={otherPerson(item, user.id)} meta="Awaiting a response" pending={actionId === item.id} actions={<button onClick={() => void cancelOrRemove(item)}><X size={16} /> Cancel request</button>} />)}
            </ConnectionSection>
          </div>
        ) : (
          <ConnectionSection title="Your connections" empty="No connections yet. Explore your matches.">
            {accepted.map((item) => { const person = otherPerson(item, user.id); return <ConnectionRow key={item.id} person={person} meta="Connected" pending={actionId === item.id} actions={<><Link href={`/messages?user=${encodeURIComponent(person.id)}`}><HeartHandshake size={16} /> Message</Link><button onClick={() => void cancelOrRemove(item)}><UserMinus size={16} /> Disconnect</button></>} />; })}
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
      <div className="bb-match-card-photo"><img src={person.profile?.avatarUrl || fallbackAvatar} alt={person.profile?.fullName || "BeeBuddy member"} /><span>{score}% match</span></div>
      <div className="bb-match-card-body">
        <div className="bb-match-name-row"><div><h2>{person.profile?.fullName || "BeeBuddy member"}</h2><span>@{person.profile?.username || "beebuddy_member"}</span></div>{person.tier !== "FREE" && <b>{person.tier}</b>}</div>
        <p className="bb-match-location"><MapPin size={15} /> {person.profile?.location || "Location not shared"}</p>
        <div className="bb-match-reasons">{reasons.length ? reasons.map((reason, index) => <span key={`${reason.code}-${index}`}>{reasonText(reason)}</span>) : <span>Potential match</span>}</div>
        <div className="bb-match-card-actions">
          <button aria-label="Pass" disabled={pending} onClick={() => onFeedback(item, "PASS")}><X size={20} /></button>
          <button className="is-connect" disabled={pending} onClick={() => onFeedback(item, "CONNECT")}>{pending ? <LoaderCircle className="bb-spin" size={18} /> : <HeartHandshake size={18} />} Connections</button>
          <button aria-label="Block" title="Block profile" disabled={pending} onClick={() => onFeedback(item, "BLOCK")}><Ban size={18} /></button>
        </div>
      </div>
    </article>
  );
}

function EmptyMatches({ enabled, refreshing, onRefresh }: { enabled: boolean; refreshing: boolean; onRefresh: () => void }) {
  return <div className="bb-match-empty"><Sparkles size={36} /><strong>{enabled ? "No pending matches" : "Matching is turned off"}</strong><p>{enabled ? "Refresh to find matches based on current profiles." : "Turn matching back on in Preferences to get recommendations."}</p>{enabled && <button type="button" disabled={refreshing} onClick={onRefresh}><RefreshCw size={17} /> Find new matches</button>}<Link href="/account/edit">Update your profile for better matches</Link></div>;
}

function ConnectionSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="bb-connection-section"><h2>{title}</h2>{hasChildren ? <div className="bb-connection-list">{children}</div> : <div className="bb-match-empty is-small"><Users size={28} /><span>{empty}</span></div>}</section>;
}

function ConnectionRow({ person, meta, pending, actions }: { person: MatchPerson; meta: string; pending: boolean; actions: React.ReactNode }) {
  return <article className={`bb-connection-row ${pending ? "is-pending" : ""}`}><img src={person.profile?.avatarUrl || fallbackAvatar} alt="" /><div className="bb-connection-person"><strong>{person.profile?.fullName || "BeeBuddy member"}</strong><span>{person.profile?.location || meta}</span>{person.profile?.location && <small>{meta}</small>}</div><div className="bb-connection-actions">{actions}</div></article>;
}

function PreferenceModal({ preference, pending, onChange, onClose, onSubmit }: { preference: MatchingPreference; pending: boolean; onChange: (value: MatchingPreference) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const updateNumber = (key: "minAge" | "maxAge" | "maxDistanceKm", value: string) => onChange({ ...preference, [key]: Number(value) });
  return <div className="bb-match-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="match-preference-title" onMouseDown={onClose}><form className="bb-match-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}><header><div><h2 id="match-preference-title">Connection preferences</h2><p>Adjust your criteria for better matches.</p></div><button type="button" onClick={onClose}><X size={20} /></button></header><label className="bb-match-switch"><span><strong>Enable matching</strong><small>Allow BeeBuddy to suggest new matches</small></span><input type="checkbox" checked={preference.enabled} onChange={(event) => onChange({ ...preference, enabled: event.target.checked })} /></label><div className="bb-match-form-grid"><label>Minimum age<input type="number" min={18} max={120} value={preference.minAge ?? 18} onChange={(event) => updateNumber("minAge", event.target.value)} /></label><label>Maximum age<input type="number" min={18} max={120} value={preference.maxAge ?? 70} onChange={(event) => updateNumber("maxAge", event.target.value)} /></label></div><label>Maximum distance (km)<input type="number" min={1} max={20000} value={preference.maxDistanceKm ?? 100} onChange={(event) => updateNumber("maxDistanceKm", event.target.value)} /></label><label>Preferred goals<input value={preference.preferredGoals.join(", ")} onChange={(event) => onChange({ ...preference, preferredGoals: event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20) })} placeholder="Friendship, running, studying..." /><small>Separate multiple goals with commas.</small></label><footer><button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="bb-spin" size={17} /> : <Check size={17} />} Save preferences</button></footer></form></div>;
}
