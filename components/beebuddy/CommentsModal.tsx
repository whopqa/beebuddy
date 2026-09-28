"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, Flag, LoaderCircle, X } from "lucide-react";
import { postsApi, type PostComment } from "@/lib/posts-client";

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function CommentsModal({
  isOpen,
  postId,
  isLoggedIn,
  onClose,
  title = "Bình luận",
  onApprovedComment,
  showReportAction = true,
}: {
  isOpen: boolean;
  postId: string | null;
  isLoggedIn: boolean;
  onClose: () => void;
  title?: string;
  onApprovedComment?: (postId: string) => void;
  showReportAction?: boolean;
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || !postId) return;
    let active = true;
    setLoading(true);
    setError("");
    setNotice("");
    postsApi.comments(postId)
      .then((data) => active && setComments(data))
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    closeButtonRef.current?.focus();
    return () => { active = false; };
  }, [isOpen, postId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !postId) return null;

  const handlePost = async (event: FormEvent) => {
    event.preventDefault();
    const content = newComment.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const result = await postsApi.createComment(postId, content);
      setComments((current) => [...current, result.comment]);
      setNewComment("");
      if (result.warning) setNotice(result.warning);
      if (result.comment.status === "APPROVED") onApprovedComment?.(postId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (commentId: string) => {
    const reason = window.prompt("Lý do báo cáo bình luận:", "Nội dung không phù hợp")?.trim();
    if (!reason) return;
    setError("");
    try {
      await postsApi.reportComment(commentId, reason);
      setNotice("BeeBuddy đã nhận báo cáo và sẽ xem xét bình luận này.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi báo cáo");
    }
  };

  return (
    <div
      className="bb-comments-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-comments-title"
    >
      <div className="bb-comments-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="bb-comments-header-row">
          <h3 id="modal-comments-title" className="bb-comments-title">{title}</h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="bb-comments-close-btn"
            aria-label="Đóng bình luận"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bb-comments-divider" />

        <div className="bb-comments-list-wrap" aria-live="polite">
          {loading ? (
            <div className="bb-comments-state"><LoaderCircle className="bb-spin" size={22} />Đang tải bình luận...</div>
          ) : error && comments.length === 0 ? (
            <div className="bb-comments-state is-error"><AlertCircle size={20} />{error}</div>
          ) : comments.length === 0 ? (
            <div className="bb-comments-state">Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện!</div>
          ) : comments.map((comment) => (
            <div key={comment.id} className="bb-comment-row">
              <img
                src={comment.author.avatarUrl || "/assets/home/avatar-01.png"}
                alt={comment.author.fullName}
                className="bb-comment-user-avatar"
              />
              <div className="bb-comment-content-wrap">
                <div className="bb-comment-meta-row">
                  <span className="bb-comment-user-name">{comment.author.fullName}</span>
                  <span className="bb-comment-timestamp">{relativeTime(comment.createdAt)}</span>
                </div>
                <p className="bb-comment-body-text">{comment.content}</p>
                <div className="bb-comment-footer-row">
                  {comment.status === "FLAGGED" && (
                    <span className="bb-comment-review-badge">Đang chờ kiểm duyệt</span>
                  )}
                  {isLoggedIn && showReportAction && (
                    <button type="button" className="bb-comment-report-btn" onClick={() => handleReport(comment.id)}>
                      <Flag size={12} /> Báo cáo
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {(notice || (error && comments.length > 0)) && (
          <p className={`bb-comments-notice ${error ? "is-error" : ""}`}>{error || notice}</p>
        )}

        <div className="bb-comments-divider" />

        {isLoggedIn ? (
          <form onSubmit={handlePost} className="bb-comments-composer-row">
            <input
              type="text"
              placeholder="Viết bình luận..."
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              className="bb-comments-composer-input"
              maxLength={1000}
              disabled={submitting}
            />
            <button type="submit" className="bb-comments-post-btn" disabled={!newComment.trim() || submitting}>
              {submitting ? "Đang gửi" : "Đăng"}
            </button>
          </form>
        ) : (
          <div className="bb-comments-login-prompt">
            <Link href="/login">Đăng nhập</Link> để tham gia bình luận.
          </div>
        )}
      </div>
    </div>
  );
}
