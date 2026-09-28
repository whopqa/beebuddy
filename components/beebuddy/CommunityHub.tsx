"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Globe2,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { WebUser } from "@/lib/auth-types";
import {
  communitiesApi,
  type CommunityDetail,
  type CreatedCommunity,
  type CommunityJoinPolicy,
  type CommunityMembership,
  type CommunitySummary,
  type CommunityVisibility,
} from "@/lib/communities-client";
import type { FeedPost } from "@/lib/posts-client";
import CommentsModal from "./CommentsModal";

type HubView = "communities" | "detail";

const fallbackCover = "/assets/home/figma-community-mountain.png";
const fallbackAvatar = "/assets/home/avatar-01.png";

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

function visibilityLabel(value: CommunityVisibility) {
  if (value === "PUBLIC") return "Công khai";
  if (value === "PRIVATE") return "Riêng tư";
  return "Chỉ lời mời";
}

function policyLabel(value: CommunityJoinPolicy) {
  if (value === "OPEN") return "Tham gia tự do";
  if (value === "APPROVAL") return "Cần phê duyệt";
  return "Chỉ qua lời mời";
}

function membershipOf(community: Pick<CommunitySummary, "ownerId"> & Partial<Pick<CommunitySummary, "members">>, userId?: string) {
  if (!userId) return undefined;
  if (community.ownerId === userId) return { role: "OWNER", status: "ACTIVE" } as CommunityMembership;
  return community.members?.find((member) => member.status === "ACTIVE");
}

export default function CommunityHub({
  isLoggedIn,
  currentUser,
}: {
  isLoggedIn: boolean;
  currentUser: WebUser | null;
}) {
  const [view, setView] = useState<HubView>("communities");
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CommunityDetail | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<CommunityMembership | undefined>();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [composer, setComposer] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const loadCommunities = useCallback(async (cursor?: string) => {
    cursor ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const page = await communitiesApi.list(cursor);
      setCommunities((current) => cursor ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách cộng đồng");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { void loadCommunities(); }, [loadCommunities, isLoggedIn]);

  const visibleCommunities = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    if (!keyword) return communities;
    return communities.filter((community) =>
      `${community.name} ${community.description ?? ""}`.toLocaleLowerCase("vi").includes(keyword)
    );
  }, [communities, query]);

  const openCommunity = async (community: Pick<CommunitySummary, "id" | "slug" | "ownerId"> & Partial<CommunitySummary>) => {
    setView("detail");
    setSelected(null);
    setSelectedMembership(membershipOf(community, currentUser?.id));
    setFeed([]);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const detail = await communitiesApi.detail(community.slug);
      setSelected(detail);
      const exactMembership = detail.members.find((member) => member.userId === currentUser?.id);
      if (exactMembership) setSelectedMembership(exactMembership);
      setFeedLoading(true);
      const page = await communitiesApi.feed(community.id);
      setFeed(page.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể mở cộng đồng");
    } finally {
      setFeedLoading(false);
    }
  };

  const backToDirectory = () => {
    setView("communities");
    setSelected(null);
    setSelectedMembership(undefined);
    setFeed([]);
    setNotice("");
    setError("");
  };

  const handleMembership = async () => {
    if (!selected || actionPending) return;
    setActionPending(true);
    setError("");
    setNotice("");
    try {
      if (selectedMembership?.status === "ACTIVE") {
        await communitiesApi.leave(selected.id);
        setSelectedMembership(undefined);
        setSelected((current) => current ? { ...current, membersCount: Math.max(0, current.membersCount - 1) } : current);
        setNotice("Bạn đã rời cộng đồng.");
      } else {
        const result = await communitiesApi.join(selected.id);
        if (result.status === "PENDING") {
          setNotice("Yêu cầu tham gia đã được gửi tới quản trị viên.");
        } else {
          setSelectedMembership({ role: result.role ?? "MEMBER", status: "ACTIVE" });
          setSelected((current) => current ? { ...current, membersCount: current.membersCount + 1 } : current);
          setNotice("Bạn đã tham gia cộng đồng.");
        }
      }
      void loadCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật tư cách thành viên");
    } finally {
      setActionPending(false);
    }
  };

  const handlePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !composer.trim() || actionPending) return;
    setActionPending(true);
    setError("");
    try {
      await communitiesApi.createPost(selected.id, composer.trim());
      setComposer("");
      const page = await communitiesApi.feed(selected.id);
      setFeed(page.posts);
      setNotice("Bài viết đã được đăng vào cộng đồng.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng bài");
    } finally {
      setActionPending(false);
    }
  };

  const updateCommentCount = (postId: string) => {
    setFeed((current) => current.map((post) => post.id === postId
      ? { ...post, commentsCount: post.commentsCount + 1 }
      : post));
  };

  return (
    <main className="bb-community-hub">
      {view === "communities" ? (
        <>
          <section className="bb-community-hub-hero">
            <div>
              <span className="bb-community-hub-kicker">Cùng kết nối, cùng trưởng thành</span>
              <h1>Tìm cộng đồng dành cho bạn</h1>
              <p>Chia sẻ câu chuyện, thói quen và những điều nhỏ bé tạo nên một cuộc sống ý nghĩa hơn.</p>
            </div>
            {isLoggedIn ? (
              <button className="bb-community-primary-btn" type="button" onClick={() => setShowCreate(true)}>
                <Plus size={18} /> Tạo cộng đồng
              </button>
            ) : (
              <Link className="bb-community-primary-btn" href="/login">Đăng nhập để tạo</Link>
            )}
          </section>

          <section className="bb-community-directory" aria-labelledby="community-directory-title">
            <div className="bb-community-directory-head">
              <div>
                <h2 id="community-directory-title">Khám phá cộng đồng</h2>
                <p>{communities.length} cộng đồng bạn có thể khám phá</p>
              </div>
              <label className="bb-community-search">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc mô tả..." />
              </label>
            </div>

            {error && <div className="bb-community-alert is-error">{error}</div>}
            {loading ? (
              <div className="bb-community-empty"><LoaderCircle className="bb-spin" size={28} /> Đang tải cộng đồng...</div>
            ) : visibleCommunities.length === 0 ? (
              <div className="bb-community-empty">
                <Users size={34} />
                <strong>Chưa tìm thấy cộng đồng phù hợp</strong>
                <span>Thử từ khóa khác hoặc tạo cộng đồng đầu tiên của bạn.</span>
              </div>
            ) : (
              <div className="bb-community-card-grid">
                {visibleCommunities.map((community) => {
                  const membership = membershipOf(community, currentUser?.id);
                  return (
                    <article key={community.id} className="bb-community-card">
                      <div className="bb-community-card-cover" style={{ backgroundImage: `url(${fallbackCover})` }}>
                        <span className="bb-community-privacy-badge">
                          {community.visibility === "PUBLIC" ? <Globe2 size={13} /> : <LockKeyhole size={13} />}
                          {visibilityLabel(community.visibility)}
                        </span>
                      </div>
                      <div className="bb-community-card-body">
                        <div className="bb-community-card-title-row">
                          <img src={community.avatarMedia?.sourceUrl || community.owner.profile?.avatarUrl || fallbackAvatar} alt="" />
                          <div><h3>{community.name}</h3><span>{policyLabel(community.joinPolicy)}</span></div>
                        </div>
                        <p>{community.description || "Một không gian mới để gặp gỡ và chia sẻ cùng nhau."}</p>
                        <div className="bb-community-card-footer">
                          <span><Users size={15} /> {community.membersCount.toLocaleString("vi-VN")} thành viên</span>
                          {membership?.status === "ACTIVE" && <span className="bb-community-member-badge">Đã tham gia</span>}
                        </div>
                        <button type="button" onClick={() => void openCommunity(community)}>Xem cộng đồng</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {nextCursor && !query && (
              <button className="bb-community-load-more" type="button" disabled={loadingMore} onClick={() => void loadCommunities(nextCursor)}>
                {loadingMore ? <><LoaderCircle className="bb-spin" size={17} /> Đang tải</> : "Xem thêm cộng đồng"}
              </button>
            )}
          </section>
        </>
      ) : (
        <CommunityDetailView
          selected={selected}
          membership={selectedMembership}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          feed={feed}
          feedLoading={feedLoading}
          actionPending={actionPending}
          composer={composer}
          error={error}
          notice={notice}
          onBack={backToDirectory}
          onMembership={() => void handleMembership()}
          onComposer={setComposer}
          onPost={handlePost}
          onComments={setCommentPostId}
        />
      )}

      {showCreate && (
        <CreateCommunityModal
          onClose={() => setShowCreate(false)}
          onCreated={async (community) => {
            setShowCreate(false);
            await loadCommunities();
            await openCommunity(community);
          }}
        />
      )}

      <CommentsModal
        isOpen={Boolean(commentPostId)}
        postId={commentPostId}
        isLoggedIn={isLoggedIn}
        onClose={() => setCommentPostId(null)}
        onApprovedComment={updateCommentCount}
      />
    </main>
  );
}

function CommunityDetailView({
  selected,
  membership,
  isLoggedIn,
  currentUser,
  feed,
  feedLoading,
  actionPending,
  composer,
  error,
  notice,
  onBack,
  onMembership,
  onComposer,
  onPost,
  onComments,
}: {
  selected: CommunityDetail | null;
  membership?: CommunityMembership;
  isLoggedIn: boolean;
  currentUser: WebUser | null;
  feed: FeedPost[];
  feedLoading: boolean;
  actionPending: boolean;
  composer: string;
  error: string;
  notice: string;
  onBack: () => void;
  onMembership: () => void;
  onComposer: (value: string) => void;
  onPost: (event: FormEvent) => void;
  onComments: (postId: string) => void;
}) {
  if (!selected) {
    return (
      <section className="bb-community-detail-shell">
        <button className="bb-community-back" type="button" onClick={onBack}><ArrowLeft size={18} /> Quay lại</button>
        {error ? <div className="bb-community-alert is-error">{error}</div> : <div className="bb-community-empty"><LoaderCircle className="bb-spin" size={28} /> Đang mở cộng đồng...</div>}
      </section>
    );
  }

  const isMember = membership?.status === "ACTIVE";
  const isOwner = membership?.role === "OWNER" || selected.ownerId === currentUser?.id;

  return (
    <section className="bb-community-detail-shell">
      <button className="bb-community-back" type="button" onClick={onBack}><ArrowLeft size={18} /> Tất cả cộng đồng</button>
      <div className="bb-community-detail-cover" style={{ backgroundImage: `url(${selected.coverMedia?.sourceUrl || fallbackCover})` }} />
      <div className="bb-community-detail-header">
        <img className="bb-community-detail-avatar" src={selected.avatarMedia?.sourceUrl || selected.owner.profile?.avatarUrl || fallbackAvatar} alt="" />
        <div className="bb-community-detail-copy">
          <div className="bb-community-detail-title"><h1>{selected.name}</h1><span>{visibilityLabel(selected.visibility)}</span></div>
          <p>{selected.description || "Một không gian để cùng nhau chia sẻ và phát triển."}</p>
          <div className="bb-community-detail-meta">
            <span><Users size={16} /> {selected.membersCount.toLocaleString("vi-VN")} thành viên</span>
            <span><ShieldCheck size={16} /> {policyLabel(selected.joinPolicy)}</span>
            <span><CalendarDays size={16} /> Tạo {relativeTime(selected.createdAt)}</span>
          </div>
        </div>
        <div className="bb-community-detail-action">
          {!isLoggedIn ? (
            <Link className="bb-community-primary-btn" href="/login">Đăng nhập để tham gia</Link>
          ) : isOwner ? (
            <span className="bb-community-owner-chip"><ShieldCheck size={16} /> Bạn là chủ cộng đồng</span>
          ) : selected.joinPolicy === "INVITE_ONLY" && !isMember ? (
            <span className="bb-community-owner-chip"><LockKeyhole size={16} /> Cần lời mời</span>
          ) : (
            <button className={isMember ? "bb-community-secondary-btn" : "bb-community-primary-btn"} type="button" disabled={actionPending} onClick={onMembership}>
              {actionPending ? <LoaderCircle className="bb-spin" size={17} /> : isMember ? "Rời cộng đồng" : selected.joinPolicy === "APPROVAL" ? "Gửi yêu cầu tham gia" : "Tham gia cộng đồng"}
            </button>
          )}
        </div>
      </div>

      {(error || notice) && <div className={`bb-community-alert ${error ? "is-error" : "is-success"}`}>{error || notice}</div>}

      <div className="bb-community-detail-layout">
        <div className="bb-community-feed-column">
          {isMember && (
            <form className="bb-community-composer" onSubmit={onPost}>
              <img src={currentUser?.profile?.avatarUrl || fallbackAvatar} alt="" />
              <div>
                <textarea value={composer} onChange={(event) => onComposer(event.target.value)} maxLength={10000} placeholder={`Chia sẻ điều gì đó với ${selected.name}...`} />
                <button type="submit" disabled={!composer.trim() || actionPending}><Send size={16} /> {actionPending ? "Đang đăng" : "Đăng bài"}</button>
              </div>
            </form>
          )}

          {feedLoading ? (
            <div className="bb-community-empty"><LoaderCircle className="bb-spin" size={25} /> Đang tải bảng tin...</div>
          ) : feed.length === 0 ? (
            <div className="bb-community-empty"><MessageCircle size={32} /><strong>Chưa có bài viết</strong><span>{isMember ? "Hãy bắt đầu câu chuyện đầu tiên." : "Hãy quay lại sau để đọc những chia sẻ mới."}</span></div>
          ) : feed.map((post) => (
            <article className="bb-community-post" key={post.id}>
              <header>
                <img src={post.author.avatarUrl || fallbackAvatar} alt="" />
                <div><strong>{post.author.fullName}</strong><span>@{post.author.username} · {relativeTime(post.createdAt)}</span></div>
              </header>
              <p>{post.content}</p>
              {post.mediaUrls.length > 0 && <img className="bb-community-post-media" src={post.mediaUrls[0]} alt="Nội dung bài viết" />}
              <footer>
                <span><Heart size={17} /> {post.likesCount}</span>
                <button type="button" onClick={() => onComments(post.id)}><MessageCircle size={17} /> {post.commentsCount} bình luận</button>
              </footer>
            </article>
          ))}
        </div>

        <aside className="bb-community-members-panel">
          <h2>Thành viên nổi bật</h2>
          <div className="bb-community-owner-row">
            <img src={selected.owner.profile?.avatarUrl || fallbackAvatar} alt="" />
            <div><strong>{selected.owner.profile?.fullName || "Người dùng BeeBuddy"}</strong><span>Chủ cộng đồng</span></div>
          </div>
          {selected.members.filter((member) => member.userId !== selected.ownerId).slice(0, 8).map((member) => (
            <div className="bb-community-owner-row" key={member.id}>
              <img src={member.user.profile?.avatarUrl || fallbackAvatar} alt="" />
              <div><strong>{member.user.profile?.fullName || "Người dùng BeeBuddy"}</strong><span>{member.role === "MODERATOR" ? "Điều hành viên" : "Thành viên"}</span></div>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}

function CreateCommunityModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (community: CreatedCommunity) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CommunityVisibility>("PUBLIC");
  const [joinPolicy, setJoinPolicy] = useState<CommunityJoinPolicy>("OPEN");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 3 || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const community = await communitiesApi.create({ name: name.trim(), description: description.trim() || undefined, visibility, joinPolicy });
      await onCreated(community);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo cộng đồng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bb-community-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-community-title" onMouseDown={onClose}>
      <form className="bb-community-modal" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="bb-community-modal-head"><div><h2 id="create-community-title">Tạo cộng đồng mới</h2><p>Xây một không gian có mục đích rõ ràng ngay từ đầu.</p></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={20} /></button></div>
        {error && <div className="bb-community-alert is-error">{error}</div>}
        <label>Tên cộng đồng<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} required placeholder="Ví dụ: Chạy bộ mỗi sáng" /></label>
        <label>Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Cộng đồng này dành cho ai và cùng làm gì?" /></label>
        <div className="bb-community-form-grid">
          <label>Quyền riêng tư<select value={visibility} onChange={(event) => setVisibility(event.target.value as CommunityVisibility)}><option value="PUBLIC">Công khai</option><option value="PRIVATE">Riêng tư</option><option value="INVITE_ONLY">Chỉ lời mời</option></select></label>
          <label>Cách tham gia<select value={joinPolicy} onChange={(event) => setJoinPolicy(event.target.value as CommunityJoinPolicy)}><option value="OPEN">Tự do tham gia</option><option value="APPROVAL">Cần phê duyệt</option><option value="INVITE_ONLY">Chỉ qua lời mời</option></select></label>
        </div>
        <div className="bb-community-modal-actions"><button type="button" onClick={onClose}>Hủy</button><button type="submit" disabled={name.trim().length < 3 || submitting}>{submitting ? <><LoaderCircle className="bb-spin" size={17} /> Đang tạo</> : "Tạo cộng đồng"}</button></div>
      </form>
    </div>
  );
}
