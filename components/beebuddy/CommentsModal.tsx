"use client";

import { useState } from "react";
import { X, Heart } from "lucide-react";

export type Comment = {
  id: string;
  name: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
  liked?: boolean;
};

const initialComments: Comment[] = [
  {
    id: "1",
    name: "Hannah Abbott",
    avatar: "/assets/community/hannah_abbott.png",
    time: "2h ago",
    text: "This is absolutely incredible! Love the vibrant orange accents so much.",
    likes: 12,
  },
  {
    id: "2",
    name: "Marcus Vance",
    avatar: "/assets/community/marcus_vance.png",
    time: "4h ago",
    text: "Matches the design system exactly. Super clean, fast, and beautifully responsive.",
    likes: 8,
  },
  {
    id: "3",
    name: "Clara Bennett",
    avatar: "/assets/community/clara_bennett.png",
    time: "1d ago",
    text: "The rounded aesthetic on these modal overlays is extremely satisfying. Perfect execution!",
    likes: 19,
  },
];

export default function CommentsModal({
  isOpen,
  onClose,
  title = "Comments",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");

  if (!isOpen) return null;

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const item: Comment = {
      id: Date.now().toString(),
      name: "You (BeeBuddy Member)",
      avatar: "/assets/community/header_avatar.png",
      time: "Just now",
      text: newComment.trim(),
      likes: 0,
    };

    setComments([...comments, item]);
    setNewComment("");
  };

  return (
    <div
      className="bb-comments-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-comments-title"
    >
      <div
        className="bb-comments-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bb-comments-header-row">
          <h3 id="modal-comments-title" className="bb-comments-title">
            Comments
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="bb-comments-close-btn"
            aria-label="Close comments"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bb-comments-divider" />

        <div className="bb-comments-list-wrap">
          {comments.map((c) => (
            <div key={c.id} className="bb-comment-row">
              <img
                src={c.avatar}
                alt={c.name}
                className="bb-comment-user-avatar"
              />
              <div className="bb-comment-content-wrap">
                <div className="bb-comment-meta-row">
                  <span className="bb-comment-user-name">{c.name}</span>
                  <span className="bb-comment-timestamp">{c.time}</span>
                </div>
                <p className="bb-comment-body-text">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bb-comments-divider" />

        <form onSubmit={handlePost} className="bb-comments-composer-row">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bb-comments-composer-input"
          />
          <button
            type="submit"
            className="bb-comments-post-btn"
            disabled={!newComment.trim()}
          >
            post
          </button>
        </form>
      </div>
    </div>
  );
}
