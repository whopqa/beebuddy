"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Laptop, LogOut, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { accountApi, type AccountSession } from "@/lib/account-client";

export default function SecurityHub({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const load = async () => {
    if (!isLoggedIn) return;
    setLoading(true); setError("");
    try { setSessions(await accountApi.sessions()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load sign-in sessions"); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ void load(); },[isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const revokeOthers = async () => {
    setWorking(true); setError("");
    try { const result = await accountApi.revokeOtherSessions(); setMessage(`Signed out ${result.revokedCount} other sessions.`); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign out other sessions"); }
    finally { setWorking(false); }
  };
  const revoke = async (session: AccountSession) => {
    setWorking(true); setError("");
    try { await accountApi.revokeSession(session.id); setMessage("Sign-in session revoked."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to revoke the session"); }
    finally { setWorking(false); }
  };

  if (!isLoggedIn) return <main className="bb-canvas"><div className="max-w-3xl mx-auto py-20 px-5 text-center"><ShieldCheck size={48} className="mx-auto text-amber-500"/><h1 className="text-3xl font-extrabold mt-4">Account security</h1><p className="text-gray-500 mt-2">Sign in to view and manage your sessions.</p><Link href="/login" className="inline-block mt-6 bg-[#FFD027] rounded-xl px-5 py-3 font-bold">Sign in</Link></div></main>;

  return <main className="bb-canvas"><div className="max-w-5xl mx-auto py-10 px-5 space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Security and sign-in sessions</h1><p className="text-sm text-gray-500 mt-1">Device information below is recorded when you sign in and stored in PostgreSQL.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="border bg-white rounded-xl p-2.5" aria-label="Refresh"><RefreshCw size={17}/></button><button disabled={working} onClick={()=>void revokeOthers()} className="bg-red-600 text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2"><LogOut size={16}/>Sign out other sessions</button></div></div>
    {message&&<div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-sm">{message}</div>}{error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
    <section className="bg-white border rounded-2xl overflow-hidden shadow-sm"><div className="p-5 border-b flex justify-between items-center"><div><h2 className="font-bold">Sign-in activity</h2><p className="text-xs text-gray-500 mt-1">Up to 30 recent sessions, including expired and revoked sessions.</p></div><Link href="/change-password" className="text-xs font-bold text-amber-700">Change password</Link></div>{loading?<p className="p-10 text-center text-sm text-gray-500">Loading...</p>:sessions.length===0?<p className="p-10 text-center text-sm text-gray-500">No sign-in sessions yet.</p>:<div className="divide-y">{sessions.map(session=><SessionRow key={session.id} session={session} working={working} onRevoke={revoke}/>)}</div>}</section>
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900"><strong>Note:</strong> changing your password revokes all sessions, including this one. Sign in again with your new password.</div>
  </div></main>;
}

function SessionRow({session,working,onRevoke}:{session:AccountSession;working:boolean;onRevoke:(session:AccountSession)=>Promise<void>}) {
  const isMobile = /mobile|ios|android/i.test(`${session.platform} ${session.userAgent}`);
  const status = session.isCurrent ? "CURRENT" : session.isActive ? "ACTIVE" : session.revokedAt ? "REVOKED" : "EXPIRED";
  return <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">{isMobile?<Smartphone size={19}/>:<Laptop size={19}/>}</div><div><p className="font-bold text-sm">{session.deviceName||session.platform||"Web browser"}</p><p className="text-xs text-gray-500 max-w-xl break-words">{session.userAgent||"User agent unavailable"}</p><p className="text-xs text-gray-500 mt-1">IP: {session.ipAddress||"Unknown"} · last used {new Date(session.lastUsedAt).toLocaleString("en-US")}</p></div></div><div className="flex items-center gap-3 sm:justify-end"><span className={`text-[11px] font-bold px-2 py-1 rounded-full ${session.isActive?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-600"}`}>{status}</span>{session.isActive&&!session.isCurrent&&<button disabled={working} onClick={()=>void onRevoke(session)} className="text-xs font-bold text-red-600 border border-red-200 rounded-lg px-3 py-2">Revoke</button>}</div></div>;
}
