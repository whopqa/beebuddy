"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Flag, Globe2, Heart, ImagePlus, LoaderCircle, Lock, MessageCircle, Send, Trash2, Users, X } from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import { connectionsApi, type Connection } from "@/lib/connections-client";
import { uploadImage } from "@/lib/media-client";
import { postsApi, type FeedPost, type PostVisibility } from "@/lib/posts-client";
import CommentsModal from "./CommentsModal";

const fallbackAvatar = "/assets/home/avatar-01.png";

function otherPerson(connection: Connection, userId: string) {
  return connection.requesterId === userId ? connection.addressee : connection.requester;
}

function visibilityLabel(value: PostVisibility) {
  if (value === "CONNECTIONS") return "Kết nối";
  if (value === "SELECTED") return "Đã chọn";
  if (value === "PRIVATE") return "Chỉ mình tôi";
  return "Công khai";
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function FeedHub() {
  const [user, setUser] = useState<WebUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [retainedAssets, setRetainedAssets] = useState<Array<{ id: string; sourceUrl?: string | null }>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const loadFeed = useCallback(async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true); setError("");
    try { const result = await postsApi.feed(nextPage, 10); setPosts((rows) => append ? [...rows, ...result.posts] : result.posts); setPage(result.page); setTotalPages(result.totalPages); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải bảng tin"); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    let active = true;
    webAuth.me().then(async (current) => {
      if (!active) return;
      setUser(current);
      const rows = await connectionsApi.list().catch(() => []);
      if (active) setConnections(rows.filter((item) => item.status === "ACCEPTED"));
    }).catch(() => active && setUser(null)).finally(() => { if (active) { setAuthResolved(true); void loadFeed(); } });
    return () => { active = false; };
  }, [loadFeed]);

  const resetComposer = () => { setContent(""); setVisibility("PUBLIC"); setSelectedUserIds([]); setImages([]); setRetainedAssets([]); setEditingId(null); };
  const chooseImages = (files: File[]) => {
    const available = Math.max(0, 4 - retainedAssets.length);
    const next = files.slice(0, available);
    if (next.some((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) { setError("Mỗi ảnh phải là JPEG/PNG/WebP/GIF và không vượt quá 5 MB."); return; }
    setError(""); setImages(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if ((!content.trim() && images.length === 0 && retainedAssets.length === 0) || pending) return;
    if (visibility === "SELECTED" && selectedUserIds.length === 0) { setError("Hãy chọn ít nhất một người được xem bài viết."); return; }
    setPending("composer"); setError(""); setNotice("");
    try {
      const uploaded = await Promise.all(images.map((file) => uploadImage(file, "post")));
      const input = { content: content.trim(), visibility, mediaAssetIds: [...retainedAssets.map((asset) => asset.id), ...uploaded.map((asset) => asset.id)], selectedUserIds };
      const result = editingId ? await postsApi.update(editingId, input) : await postsApi.create(input);
      resetComposer(); await loadFeed(); setNotice(result.warning || (editingId ? "Đã cập nhật bài viết." : "Đã đăng bài viết."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu bài viết"); }
    finally { setPending(""); }
  };

  const edit = (post: FeedPost) => {
    setEditingId(post.id); setContent(post.content); setVisibility(post.visibility); setRetainedAssets(post.mediaAssets || []); setImages([]); setSelectedUserIds(post.selectedUserIds || []); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (post: FeedPost) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết này?")) return;
    setPending(post.id); setError("");
    try { await postsApi.remove(post.id); setPosts((rows) => rows.filter((row) => row.id !== post.id)); setNotice("Đã xóa bài viết."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xóa bài viết"); }
    finally { setPending(""); }
  };
  const toggleLike = async (post: FeedPost) => {
    if (!user) { window.location.href = "/login"; return; }
    const next = !post.likedByCurrentUser;
    setPosts((rows) => rows.map((row) => row.id === post.id ? { ...row, likedByCurrentUser: next, likesCount: Math.max(0, row.likesCount + (next ? 1 : -1)) } : row));
    try { const result = await postsApi.setLike(post.id, next); setPosts((rows) => rows.map((row) => row.id === post.id ? { ...row, likedByCurrentUser: result.liked, likesCount: result.likesCount } : row)); }
    catch (cause) { setPosts((rows) => rows.map((row) => row.id === post.id ? post : row)); setError(cause instanceof Error ? cause.message : "Không thể cập nhật lượt thích"); }
  };
  const report = async (post: FeedPost) => {
    if (!user) { window.location.href = "/login"; return; }
    const reason = window.prompt("Lý do báo cáo bài viết:")?.trim(); if (!reason) return;
    try { await postsApi.reportPost(post.id, reason); setNotice("BeeBuddy đã nhận báo cáo của bạn."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể gửi báo cáo"); }
  };

  const acceptedPeople = user ? connections.map((item) => otherPerson(item, user.id)) : [];
  return <main className="bb-main-feed-page"><section className="bb-main-feed-hero"><div><span>Bảng tin BeeBuddy</span><h1>Chia sẻ những điều ý nghĩa</h1><p>Kết nối qua câu chuyện, khoảnh khắc và những bước tiến nhỏ mỗi ngày.</p></div></section><section className="bb-main-feed-shell">
    {(error || notice) && <div className={`bb-community-alert ${error ? "is-error" : "is-success"}`}>{error || notice}</div>}
    {authResolved && user && <form className="bb-main-feed-composer" onSubmit={submit}><header><img src={user.profile?.avatarUrl || fallbackAvatar} alt="" /><div><strong>{editingId ? "Chỉnh sửa bài viết" : `Bạn đang nghĩ gì, ${user.profile?.fullName?.split(" ").at(-1) || "bạn"}?`}</strong><span>Tối đa 4 ảnh, mỗi ảnh không quá 5 MB</span></div>{editingId && <button type="button" onClick={resetComposer}><X size={18} /></button>}</header><textarea maxLength={10000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Chia sẻ câu chuyện của bạn..." />
      {(retainedAssets.length > 0 || previews.length > 0) && <div className="bb-main-feed-preview-grid">{retainedAssets.map((asset) => asset.sourceUrl && <div key={asset.id}><img src={asset.sourceUrl} alt="Ảnh hiện có" /><button type="button" onClick={() => setRetainedAssets((rows) => rows.filter((row) => row.id !== asset.id))}><X size={14} /></button></div>)}{previews.map((url, index) => <div key={url}><img src={url} alt={`Ảnh mới ${index + 1}`} /><button type="button" onClick={() => setImages((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><X size={14} /></button></div>)}</div>}
      <div className="bb-main-feed-composer-footer"><label><ImagePlus size={18} /> Thêm ảnh<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseImages(Array.from(event.target.files || []))} /></label><select value={visibility} onChange={(event) => { setVisibility(event.target.value as PostVisibility); if (event.target.value !== "SELECTED") setSelectedUserIds([]); }}><option value="PUBLIC">Công khai</option><option value="CONNECTIONS">Kết nối</option><option value="SELECTED">Người được chọn</option><option value="PRIVATE">Chỉ mình tôi</option></select><button disabled={pending === "composer" || (!content.trim() && !images.length && !retainedAssets.length)}>{pending === "composer" ? <LoaderCircle className="bb-spin" size={17} /> : <Send size={17} />}{editingId ? "Lưu" : "Đăng"}</button></div>
      {visibility === "SELECTED" && <div className="bb-main-feed-audience"><strong>Chọn người được xem</strong>{acceptedPeople.length ? acceptedPeople.map((person) => <label key={person.id}><input type="checkbox" checked={selectedUserIds.includes(person.id)} onChange={(event) => setSelectedUserIds((rows) => event.target.checked ? [...rows, person.id] : rows.filter((id) => id !== person.id))} /><img src={person.profile?.avatarUrl || fallbackAvatar} alt="" /><span>{person.profile?.fullName || "Thành viên BeeBuddy"}</span></label>) : <span>Bạn chưa có kết nối nào để lựa chọn.</span>}</div>}
    </form>}
    {loading ? <div className="bb-community-empty"><LoaderCircle className="bb-spin" /> Đang tải bảng tin...</div> : posts.length === 0 ? <div className="bb-community-empty"><MessageCircle size={34} /><strong>Chưa có bài viết</strong><span>Hãy chia sẻ câu chuyện đầu tiên.</span></div> : <div className="bb-main-feed-list">{posts.map((post) => <article key={post.id} className="bb-main-feed-card"><header><img src={post.author.avatarUrl || fallbackAvatar} alt="" /><div><strong>{post.author.fullName}</strong><span>@{post.author.username} · {relativeTime(post.createdAt)}</span></div><i>{post.visibility === "PUBLIC" ? <Globe2 size={14} /> : post.visibility === "PRIVATE" ? <Lock size={14} /> : <Users size={14} />}{visibilityLabel(post.visibility)}</i>{post.canEdit && <aside><button title="Sửa" onClick={() => edit(post)}><Edit3 size={16} /></button><button title="Xóa" disabled={pending === post.id} onClick={() => void remove(post)}><Trash2 size={16} /></button></aside>}</header>{post.content && <p>{post.content}</p>}{post.mediaUrls.length > 0 && <div className={`bb-main-feed-media count-${Math.min(4, post.mediaUrls.length)}`}>{post.mediaUrls.slice(0, 4).map((url) => <img key={url} src={url} alt="Ảnh bài viết" />)}</div>}<footer><button className={post.likedByCurrentUser ? "is-liked" : ""} onClick={() => void toggleLike(post)}><Heart size={18} fill={post.likedByCurrentUser ? "currentColor" : "none"} />{post.likesCount}</button><button onClick={() => setCommentPostId(post.id)}><MessageCircle size={18} />{post.commentsCount}</button>{!post.canEdit && <button onClick={() => void report(post)}><Flag size={17} />Báo cáo</button>}</footer></article>)}</div>}
    {page < totalPages && <button className="bb-community-load-more" disabled={loadingMore} onClick={() => void loadFeed(page + 1, true)}>{loadingMore ? "Đang tải..." : "Xem thêm"}</button>}
  </section><CommentsModal isOpen={Boolean(commentPostId)} postId={commentPostId} isLoggedIn={Boolean(user)} onClose={() => setCommentPostId(null)} onApprovedComment={(postId) => setPosts((rows) => rows.map((row) => row.id === postId ? { ...row, commentsCount: row.commentsCount + 1 } : row))} /></main>;
}
