"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { CheckCircle2, EyeOff, Flag, Plus, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { adminApi, type AdminReport, type BadWord, type FlaggedComment, type FlaggedPost } from "@/lib/admin-client";

type Tab = "POSTS" | "COMMENTS" | "REPORTS" | "BADWORDS";

export default function AdminModerationPage() {
  const [tab, setTab] = useState<Tab>("POSTS");
  const [posts, setPosts] = useState<FlaggedPost[]>([]);
  const [comments, setComments] = useState<FlaggedComment[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [badwords, setBadwords] = useState<BadWord[]>([]);
  const [word, setWord] = useState("");
  const [category, setCategory] = useState("PROFANITY");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [postData, commentData, reportData, wordData] = await Promise.all([adminApi.posts(), adminApi.comments(), adminApi.reports(), adminApi.badwords()]);
      setPosts(postData.posts); setComments(commentData.comments); setReports(reportData.reports); setBadwords(wordData);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load moderation data"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const flash = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 3500); };

  const moderatePost = async (post: FlaggedPost, action: "APPROVE" | "HIDE") => {
    if (action === "HIDE" && !window.confirm("Hide this post from every feed?")) return;
    setWorkingId(post.id); setError("");
    try { await adminApi.moderatePost(post.id, action); setPosts((rows) => rows.filter((row) => row.id !== post.id)); setReports((rows) => rows.filter((row) => row.post?.id !== post.id)); flash(action === "APPROVE" ? "Post approved." : "Post hidden."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to moderate the post"); }
    finally { setWorkingId(""); }
  };

  const moderateComment = async (comment: FlaggedComment, action: "APPROVE" | "HIDE") => {
    setWorkingId(comment.id); setError("");
    try { await adminApi.moderateComment(comment.id, action); setComments((rows) => rows.filter((row) => row.id !== comment.id)); setReports((rows) => rows.filter((row) => row.comment?.id !== comment.id)); flash(action === "APPROVE" ? "Comment approved." : "Comment hidden."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to moderate the comment"); }
    finally { setWorkingId(""); }
  };

  const resolveReport = async (report: AdminReport, action: "RESOLVE" | "DISMISS") => {
    setWorkingId(report.id); setError("");
    try { await adminApi.resolveReport(report.id, action, action === "DISMISS" ? "No violation found" : "Resolved manually"); setReports((rows) => rows.filter((row) => row.id !== report.id)); flash(action === "DISMISS" ? "Report dismissed." : "Report resolved."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to resolve the report"); }
    finally { setWorkingId(""); }
  };

  const addWord = async (event: FormEvent) => {
    event.preventDefault(); if (!word.trim()) return; setError("");
    try { const created = await adminApi.addBadword(word.trim(), category); setBadwords((rows) => [created, ...rows.filter((row) => row.id !== created.id)]); setWord(""); flash(`Added “${created.pattern}”.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add blocked word"); }
  };
  const removeWord = async (item: BadWord) => {
    setWorkingId(item.id); setError("");
    try { await adminApi.deleteBadword(item.id); setBadwords((rows) => rows.filter((row) => row.id !== item.id)); flash(`Deleted “${item.pattern}”.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete blocked word"); }
    finally { setWorkingId(""); }
  };

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div><h1 className="text-2xl font-extrabold">Content moderation</h1><p className="text-sm text-gray-500 mt-1">Review posts, comments, reports, and the blocked-word filter.</p></div>
    {message && <Notice tone="green">{message}</Notice>}{error && <Notice tone="red">{error}</Notice>}
    <div className="flex border-b overflow-x-auto"><TabButton active={tab === "POSTS"} onClick={() => setTab("POSTS")}>Posts ({posts.length})</TabButton><TabButton active={tab === "COMMENTS"} onClick={() => setTab("COMMENTS")}>Comments ({comments.length})</TabButton><TabButton active={tab === "REPORTS"} onClick={() => setTab("REPORTS")}>Reports ({reports.length})</TabButton><TabButton active={tab === "BADWORDS"} onClick={() => setTab("BADWORDS")}>Blocked words ({badwords.length})</TabButton></div>
    {loading ? <div className="p-12 text-center text-sm text-gray-500">Loading...</div> : tab === "POSTS" ? <PostQueue posts={posts} workingId={workingId} moderate={moderatePost} /> : tab === "COMMENTS" ? <CommentQueue comments={comments} workingId={workingId} moderate={moderateComment} /> : tab === "REPORTS" ? <ReportQueue reports={reports} workingId={workingId} resolve={resolveReport} /> : <BadwordPanel items={badwords} word={word} category={category} workingId={workingId} setWord={setWord} setCategory={setCategory} add={addWord} remove={removeWord} />}
  </div>;
}

function PostQueue({ posts, workingId, moderate }: { posts: FlaggedPost[]; workingId: string; moderate: (post: FlaggedPost, action: "APPROVE" | "HIDE") => void }) {
  if (!posts.length) return <Empty icon={<CheckCircle2 />} title="No posts need review" />;
  return <section className="space-y-4">{posts.map((post) => <article key={post.id} className="bg-white border rounded-2xl p-5 space-y-4"><div className="flex justify-between gap-4"><div><p className="font-bold">{post.author.profile?.fullName || post.author.email}</p><p className="text-xs text-gray-500">{post.author.email} · {new Date(post.createdAt).toLocaleString("en-US")}</p></div><Badge>{post.reports.length} reports</Badge></div><p className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap">{post.content || "(Image-only post)"}</p>{post.mediaUrls.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{post.mediaUrls.map((url) => <img key={url} src={url} alt="Media awaiting review" className="w-full aspect-square object-cover rounded-xl" />)}</div>}<p className="rounded-xl bg-red-50 p-3 text-xs text-red-800"><strong>Reason:</strong> {post.reports.map((report) => report.reason).join("; ")}</p><Actions disabled={workingId === post.id} approve={() => moderate(post, "APPROVE")} hide={() => moderate(post, "HIDE")} /></article>)}</section>;
}

function CommentQueue({ comments, workingId, moderate }: { comments: FlaggedComment[]; workingId: string; moderate: (comment: FlaggedComment, action: "APPROVE" | "HIDE") => void }) {
  if (!comments.length) return <Empty icon={<CheckCircle2 />} title="No comments need review" />;
  return <section className="space-y-4">{comments.map((comment) => <article key={comment.id} className="bg-white border rounded-2xl p-5 space-y-4"><div className="flex justify-between gap-4"><div><p className="font-bold">{comment.author.profile?.fullName || comment.author.email}</p><p className="text-xs text-gray-500">{comment.author.email} · {new Date(comment.createdAt).toLocaleString("en-US")}</p></div><Badge>{comment.status}</Badge></div><blockquote className="border-l-4 border-red-300 bg-red-50 p-3 text-sm">{comment.content}</blockquote><p className="text-xs text-gray-600"><strong>Reports:</strong> {comment.reports.map((report) => report.reason).join("; ") || "Flagged by the system"}</p><details className="text-xs text-gray-500"><summary className="cursor-pointer font-semibold">View original post</summary><p className="mt-2 p-3 bg-gray-50 rounded-lg">{comment.post.content}</p></details><Actions disabled={workingId === comment.id} approve={() => moderate(comment, "APPROVE")} hide={() => moderate(comment, "HIDE")} /></article>)}</section>;
}

function ReportQueue({ reports, workingId, resolve }: { reports: AdminReport[]; workingId: string; resolve: (report: AdminReport, action: "RESOLVE" | "DISMISS") => void }) {
  if (!reports.length) return <Empty icon={<Flag />} title="No open reports" />;
  return <section className="space-y-3">{reports.map((report) => <article key={report.id} className="bg-white border rounded-2xl p-5"><div className="flex flex-col md:flex-row md:items-start justify-between gap-4"><div className="space-y-2"><div className="flex gap-2"><Badge>{report.source}</Badge><span className="bg-gray-100 text-gray-700 rounded-full px-2 py-1 text-xs font-bold">{report.reasonCode || "GENERAL"}</span></div><p className="font-semibold text-sm">{report.reason}</p><p className="text-xs text-gray-500">{report.post ? `Post · ${report.post.author.profile?.fullName || report.post.author.email}` : report.comment ? `Comment · ${report.comment.author.profile?.fullName || report.comment.author.email}` : report.targetUser ? `User · ${report.targetUser.profile?.fullName || report.targetUser.email}` : "Other target"}</p><p className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString("en-US")}</p></div><div className="flex gap-2"><button disabled={workingId === report.id} onClick={() => resolve(report, "DISMISS")} className="px-3 py-2 border rounded-lg text-xs font-bold flex items-center gap-1"><XCircle size={14} />Dismiss</button><button disabled={workingId === report.id} onClick={() => resolve(report, "RESOLVE")} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14} />Resolve</button></div></div></article>)}</section>;
}

function BadwordPanel({ items, word, category, workingId, setWord, setCategory, add, remove }: { items: BadWord[]; word: string; category: string; workingId: string; setWord: (v: string) => void; setCategory: (v: string) => void; add: (event: FormEvent) => void; remove: (item: BadWord) => void }) {
  return <section className="grid lg:grid-cols-[340px_1fr] gap-5"><form onSubmit={add} className="bg-white border rounded-2xl p-5 space-y-4 h-fit"><h2 className="font-bold flex gap-2"><Plus size={18} />Add blocked word</h2><input value={word} onChange={(event) => setWord(event.target.value)} placeholder="Word or phrase" className="w-full border rounded-xl p-3 text-sm" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full border rounded-xl p-3 text-sm"><option>PROFANITY</option><option>SCAM</option><option>HARASSMENT</option><option>OFFENSIVE</option></select><button className="w-full bg-[#FFD027] rounded-xl py-2.5 text-sm font-bold">Add to filter</button></form><div className="bg-white border rounded-2xl overflow-hidden"><div className="divide-y">{items.length === 0 ? <Empty icon={<ShieldAlert />} title="No blocked words yet" /> : items.map((item) => <div key={item.id} className="p-4 flex items-center justify-between gap-3"><div><p className="font-bold text-sm">{item.pattern}</p><p className="text-xs text-gray-500">{item.category} · {item.isActive ? "Enabled" : "Disabled"}</p></div><button disabled={workingId === item.id} onClick={() => remove(item)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></div>)}</div></div></section>;
}

function Actions({ disabled, approve, hide }: { disabled: boolean; approve: () => void; hide: () => void }) { return <div className="flex justify-end gap-2"><button disabled={disabled} onClick={approve} className="px-3 py-2 border rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14} />Approve</button><button disabled={disabled} onClick={hide} className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"><EyeOff size={14} />Hide</button></div>; }
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className={`whitespace-nowrap px-4 py-3 text-sm font-bold ${active ? "border-b-2 border-amber-400" : "text-gray-500"}`}>{children}</button>; }
function Notice({ tone, children }: { tone: "green" | "red"; children: ReactNode }) { return <div className={`${tone === "green" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"} border rounded-xl p-3 text-sm`}>{children}</div>; }
function Badge({ children }: { children: ReactNode }) { return <span className="bg-red-100 text-red-700 rounded-full px-2 py-1 h-fit text-xs font-bold">{children}</span>; }
function Empty({ icon, title }: { icon: ReactNode; title: string }) { return <div className="bg-white border rounded-2xl p-12 text-center text-gray-500"><div className="flex justify-center mb-2">{icon}</div><p className="text-sm font-bold">{title}</p></div>; }
