"use client";

import { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  EyeOff,
  Trash2,
  Plus,
  AlertTriangle,
  FileText,
  Filter,
  Search,
} from "lucide-react";

interface FlaggedComment {
  id: string;
  postId: string;
  postContent: string;
  authorName: string;
  authorEmail: string;
  commentContent: string;
  flagReason: string;
  status: "FLAGGED" | "APPROVED" | "HIDDEN";
  createdAt: string;
}

interface BadWordItem {
  id: string;
  pattern: string;
  category: string;
  isActive: boolean;
}

const initialComments: FlaggedComment[] = [
  {
    id: "cm_01",
    postId: "p_101",
    postContent: "Cuối tuần này ai ở TP.HCM muốn lập team board game Avalon hoặc Catan không?...",
    authorName: "Vũ Văn Lạ",
    authorEmail: "vu.la@gmail.com",
    commentContent: "App này toàn bọn lừa đảo đấy mọi người đừng tin, scam hết!",
    flagReason: "Chứa từ cấm: 'lừa đảo', 'scam'",
    status: "FLAGGED",
    createdAt: "2026-09-22 18:40",
  },
  {
    id: "cm_02",
    postId: "p_102",
    postContent: "Chào mừng mọi người đến với cộng đồng BeeBuddy! Cùng kết nối và chia sẻ...",
    authorName: "Nguyễn Văn Hùng",
    authorEmail: "hung.nv@yahoo.com",
    commentContent: "Chơi cái trò này vcl thật, mất thời gian đm",
    flagReason: "Chứa từ ngữ xúc phạm: 'vcl', 'đm'",
    status: "FLAGGED",
    createdAt: "2026-09-22 17:15",
  },
];

const initialBadwords: BadWordItem[] = [
  { id: "bw_1", pattern: "đm", category: "PROFANITY", isActive: true },
  { id: "bw_2", pattern: "dcm", category: "PROFANITY", isActive: true },
  { id: "bw_3", pattern: "vcl", category: "PROFANITY", isActive: true },
  { id: "bw_4", pattern: "lừa đảo", category: "SCAM", isActive: true },
  { id: "bw_5", pattern: "scam", category: "SCAM", isActive: true },
  { id: "bw_6", pattern: "fuck", category: "PROFANITY", isActive: true },
  { id: "bw_7", pattern: "bitch", category: "HARASSMENT", isActive: true },
];

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<"COMMENTS" | "BADWORDS">("COMMENTS");
  const [comments, setComments] = useState<FlaggedComment[]>(initialComments);
  const [badwords, setBadwords] = useState<BadWordItem[]>(initialBadwords);
  const [newWord, setNewWord] = useState("");
  const [newCategory, setNewCategory] = useState("PROFANITY");
  const [notification, setNotification] = useState<string | null>(null);

  const handleModerate = (id: string, action: "APPROVED" | "HIDDEN") => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: action } : c))
    );
    setNotification(
      action === "APPROVED"
        ? "Đã duyệt cho phép hiển thị bình luận."
        : "Đã ẩn vĩnh viễn bình luận vi phạm khỏi feed."
    );
    setTimeout(() => setNotification(null), 3500);
  };

  const handleAddBadword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    const pattern = newWord.trim().toLowerCase();
    if (badwords.some((b) => b.pattern === pattern)) {
      setNotification("Từ cấm này đã có trong danh bạ.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const newItem: BadWordItem = {
      id: `bw_${Date.now()}`,
      pattern,
      category: newCategory,
      isActive: true,
    };

    setBadwords([newItem, ...badwords]);
    setNewWord("");
    setNotification(`Đã thêm từ cấm mới: "${pattern}" vào bộ lọc tự động.`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDeleteBadword = (id: string) => {
    setBadwords(badwords.filter((b) => b.id !== id));
    setNotification("Đã xóa từ cấm khỏi bộ lọc.");
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Kiểm Duyệt Bình Luận & Quản Lý Từ Cấm
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Bộ lọc Regex tự động ngăn chặn ngôn từ tiêu cực, lừa đảo và bảo vệ cộng đồng BeeBuddy.
        </p>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("COMMENTS")}
          className={`pb-3 px-4 text-xs font-bold transition-colors relative ${
            activeTab === "COMMENTS"
              ? "text-gray-900 border-b-2 border-[#FFD027]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span>Hàng đợi kiểm duyệt ({comments.filter((c) => c.status === "FLAGGED").length})</span>
        </button>
        <button
          onClick={() => setActiveTab("BADWORDS")}
          className={`pb-3 px-4 text-xs font-bold transition-colors relative ${
            activeTab === "BADWORDS"
              ? "text-gray-900 border-b-2 border-[#FFD027]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span>Từ điển từ cấm ({badwords.length})</span>
        </button>
      </div>

      {/* Tab 1: Moderation Queue */}
      {activeTab === "COMMENTS" && (
        <div className="space-y-4">
          {comments.length === 0 || comments.every((c) => c.status !== "FLAGGED") ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="text-base font-bold text-gray-900">
                Không có bình luận nào cần kiểm duyệt
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Bộ lọc từ cấm đang hoạt động ổn định và cộng đồng đang rất văn minh!
              </p>
            </div>
          ) : (
            comments
              .filter((c) => c.status === "FLAGGED")
              .map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-5 border border-red-200/80 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                        BỊ GẮN CỜ
                      </span>
                      <span className="text-xs font-bold text-gray-900">{c.authorName}</span>
                      <span className="text-xs text-gray-400">({c.authorEmail})</span>
                    </div>
                    <span className="text-xs text-gray-400">{c.createdAt}</span>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">
                      <FileText size={12} />
                      <span>Bài viết gốc:</span> {c.postContent}
                    </div>
                    <div className="p-3 bg-red-50/60 border border-red-100 rounded-xl text-xs font-semibold text-gray-900">
                      "{c.commentContent}"
                    </div>
                    <div className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      <span>{c.flagReason}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleModerate(c.id, "APPROVED")}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Duyệt hiển thị (Bỏ qua cảnh báo)
                    </button>
                    <button
                      onClick={() => handleModerate(c.id, "HIDDEN")}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <EyeOff size={14} />
                      <span>Ẩn vĩnh viễn</span>
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Tab 2: Badwords Management */}
      {activeTab === "BADWORDS" && (
        <div className="space-y-6">
          {/* Add Badword Form */}
          <form
            onSubmit={handleAddBadword}
            className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-end gap-3"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Từ hoặc cụm từ cấm mới (Regex / Keyword):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: lừa đảo, cờ bạc, đa cấp..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD027] focus:bg-white"
              />
            </div>

            <div className="w-full sm:w-44">
              <label className="block text-xs font-bold text-gray-700 mb-1">Phân loại vi phạm:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD027]"
              >
                <option value="PROFANITY">Từ ngữ tục tĩu (Profanity)</option>
                <option value="SCAM">Lừa đảo / Đa cấp (Scam)</option>
                <option value="HARASSMENT">Quấy rối / Công kích (Harassment)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2.5 bg-[#FFD027] hover:bg-amber-400 text-gray-950 text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus size={16} />
              <span>Thêm từ cấm</span>
            </button>
          </form>

          {/* Badwords List Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Danh Sách Từ Cấm Trong Hệ Thống</h3>
              <span className="text-xs text-gray-400">{badwords.length} mục hoạt động</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Từ khóa / Pattern</th>
                    <th className="px-5 py-3">Phân loại</th>
                    <th className="px-5 py-3">Trạng thái bộ lọc</th>
                    <th className="px-5 py-3 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {badwords.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-xs text-gray-900">
                        {item.pattern}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Đang kích hoạt
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteBadword(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa từ cấm"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
