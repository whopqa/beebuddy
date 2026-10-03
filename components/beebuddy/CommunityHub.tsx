"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Globe2,
  Heart,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { WebUser } from "@/lib/auth-types";
import {
  communitiesApi,
  type CommunityDetail,
  type CommunityManagement,
  type IncomingCommunityInvite,
  type CreatedCommunity,
  type CommunityJoinPolicy,
  type CommunityMembership,
  type CommunitySummary,
  type CommunityVisibility,
} from "@/lib/communities-client";
import { connectionsApi, type Connection } from "@/lib/connections-client";
import type { FeedPost } from "@/lib/posts-client";
import CommentsModal from "./CommentsModal";
import { uploadImage } from "@/lib/media-client";

type HubView = "communities" | "detail";

const fallbackCover = "/assets/home/figma-community-mountain.png";
const fallbackAvatar = "/assets/home/avatar-01.png";

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function visibilityLabel(value: CommunityVisibility) {
  if (value === "PUBLIC") return "Public";
  if (value === "PRIVATE") return "Private";
  return "Invite only";
}

function policyLabel(value: CommunityJoinPolicy) {
  if (value === "OPEN") return "Open to all";
  if (value === "APPROVAL") return "Approval required";
  return "By invitation only";
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
  const [postImages, setPostImages] = useState<File[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [invitations, setInvitations] = useState<IncomingCommunityInvite[]>([]);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const postImagePreviews = useMemo(() => postImages.map((file) => URL.createObjectURL(file)), [postImages]);

  useEffect(() => () => postImagePreviews.forEach((url) => URL.revokeObjectURL(url)), [postImagePreviews]);

  const loadCommunities = useCallback(async (cursor?: string) => {
    cursor ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const page = await communitiesApi.list(cursor);
      setCommunities((current) => cursor ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load communities");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadCommunities();
    if (isLoggedIn) void communitiesApi.invitations().then(setInvitations).catch(() => setInvitations([]));
    else setInvitations([]);
  }, [loadCommunities, isLoggedIn]);

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
      const exactMembership = detail.viewerMembership || detail.members.find((member) => member.userId === currentUser?.id);
      if (exactMembership) setSelectedMembership(exactMembership);
      setFeedLoading(true);
      const page = await communitiesApi.feed(community.id);
      setFeed(page.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open the community");
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
        setNotice("You left the community.");
      } else {
        const result = await communitiesApi.join(selected.id);
        if (result.status === "PENDING") {
          setNotice("Your join request was sent to the community managers.");
        } else {
          setSelectedMembership({ role: result.role ?? "MEMBER", status: "ACTIVE" });
          setSelected((current) => current ? { ...current, membersCount: current.membersCount + 1 } : current);
          setNotice("You joined the community.");
        }
      }
      void loadCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your membership");
    } finally {
      setActionPending(false);
    }
  };

  const handlePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || (!composer.trim() && postImages.length === 0) || actionPending) return;
    setActionPending(true);
    setError("");
    try {
      const uploaded = await Promise.all(postImages.map((file) => uploadImage(file, "post")));
      await communitiesApi.createPost(selected.id, composer.trim(), uploaded.map((asset) => asset.id));
      setComposer("");
      setPostImages([]);
      const page = await communitiesApi.feed(selected.id);
      setFeed(page.posts);
      setNotice("Your post was published in the community.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish the post");
    } finally {
      setActionPending(false);
    }
  };

  const updateCommentCount = (postId: string) => {
    setFeed((current) => current.map((post) => post.id === postId
      ? { ...post, commentsCount: post.commentsCount + 1 }
      : post));
  };

  const respondInvitation = async (invite: IncomingCommunityInvite, accept: boolean) => {
    setActionPending(true); setError("");
    try {
      await communitiesApi.respondInvite(invite.id, accept);
      setInvitations((rows) => rows.filter((row) => row.id !== invite.id));
      setNotice(accept ? `You joined ${invite.community.name}.` : "Invitation declined.");
      await loadCommunities();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to respond to the invitation"); }
    finally { setActionPending(false); }
  };

  return (
    <main className="bb-community-hub">
      {view === "communities" ? (
        <>
          <section className="bb-community-hub-hero">
            <div>
              <span className="bb-community-hub-kicker">Connect and grow together</span>
              <h1>Find your community</h1>
              <p>Share stories, routines, and the little things that make life more meaningful.</p>
            </div>
            {isLoggedIn ? (
              <button className="bb-community-primary-btn" type="button" onClick={() => setShowCreate(true)}>
                <Plus size={18} /> Create community
              </button>
            ) : (
              <Link className="bb-community-primary-btn" href="/login">Sign in to create</Link>
            )}
          </section>

          <section className="bb-community-directory" aria-labelledby="community-directory-title">
            <div className="bb-community-directory-head">
              <div>
                <h2 id="community-directory-title">Explore communities</h2>
                <p>{communities.length} communities to explore</p>
              </div>
              <label className="bb-community-search">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or description..." />
              </label>
            </div>

            {invitations.length > 0 && <div className="bb-community-invitations"><h3><UserPlus size={18} /> Invitations</h3>{invitations.map((invite) => <article key={invite.id}><img src={invite.community.avatarMedia?.sourceUrl || invite.invitedBy.profile?.avatarUrl || fallbackAvatar} alt="" /><div><strong>{invite.community.name}</strong><span>{invite.invitedBy.profile?.fullName || "A manager"} invited you</span></div><button disabled={actionPending} onClick={() => void respondInvitation(invite, true)}>Join</button><button disabled={actionPending} className="is-muted" onClick={() => void respondInvitation(invite, false)}>Decline</button></article>)}</div>}

            {error && <div className="bb-community-alert is-error">{error}</div>}
            {loading ? (
              <div className="bb-community-empty"><LoaderCircle className="bb-spin" size={28} /> Loading communities...</div>
            ) : visibleCommunities.length === 0 ? (
              <div className="bb-community-empty">
                <Users size={34} />
                <strong>No matching communities found</strong>
                <span>Try another search or create your first community.</span>
              </div>
            ) : (
              <div className="bb-community-card-grid">
                {visibleCommunities.map((community) => {
                  const membership = membershipOf(community, currentUser?.id);
                  return (
                    <article key={community.id} className="bb-community-directory-card">
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
                        <p>{community.description || "A new space to meet and share with others."}</p>
                        <div className="bb-community-card-footer">
                          <span><Users size={15} /> {community.membersCount.toLocaleString("en-US")} members</span>
                          {membership?.status === "ACTIVE" && <span className="bb-community-member-badge">Joined</span>}
                        </div>
                        <button type="button" onClick={() => void openCommunity(community)}>View community</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {nextCursor && !query && (
              <button className="bb-community-load-more" type="button" disabled={loadingMore} onClick={() => void loadCommunities(nextCursor)}>
                {loadingMore ? <><LoaderCircle className="bb-spin" size={17} /> Loading</> : "View more communities"}
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
          postImages={postImages}
          postImagePreviews={postImagePreviews}
          error={error}
          notice={notice}
          onBack={backToDirectory}
          onMembership={() => void handleMembership()}
          onComposer={setComposer}
          onPostImages={(files) => {
            const next = files.slice(0, 4);
            const invalid = next.find((file) => !file.type.startsWith("image/") || file.size > 4 * 1024 * 1024);
            if (invalid) {
              setError("Each file must be a JPEG, PNG, WebP, or GIF image smaller than 4 MB.");
              return;
            }
            setError("");
            setPostImages(next);
          }}
          onPost={handlePost}
          onComments={setCommentPostId}
          onManage={() => setShowManagement(true)}
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

      {showManagement && selected && currentUser && (
        <CommunityManagementModal
          communityId={selected.id}
          currentUserId={currentUser.id}
          onClose={() => setShowManagement(false)}
          onUpdated={async () => {
            const detail = await communitiesApi.detail(selected.slug);
            setSelected(detail);
            setSelectedMembership(detail.viewerMembership || detail.members.find((member) => member.userId === currentUser.id));
            await loadCommunities();
          }}
          onDeleted={() => { setShowManagement(false); backToDirectory(); void loadCommunities(); }}
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
  postImages,
  postImagePreviews,
  error,
  notice,
  onBack,
  onMembership,
  onComposer,
  onPostImages,
  onPost,
  onComments,
  onManage,
}: {
  selected: CommunityDetail | null;
  membership?: CommunityMembership;
  isLoggedIn: boolean;
  currentUser: WebUser | null;
  feed: FeedPost[];
  feedLoading: boolean;
  actionPending: boolean;
  composer: string;
  postImages: File[];
  postImagePreviews: string[];
  error: string;
  notice: string;
  onBack: () => void;
  onMembership: () => void;
  onComposer: (value: string) => void;
  onPostImages: (files: File[]) => void;
  onPost: (event: FormEvent) => void;
  onComments: (postId: string) => void;
  onManage: () => void;
}) {
  if (!selected) {
    return (
      <section className="bb-community-detail-shell">
        <button className="bb-community-back" type="button" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        {error ? <div className="bb-community-alert is-error">{error}</div> : <div className="bb-community-empty"><LoaderCircle className="bb-spin" size={28} /> Opening community...</div>}
      </section>
    );
  }

  const isMember = membership?.status === "ACTIVE";
  const isOwner = membership?.role === "OWNER" || selected.ownerId === currentUser?.id;
  const isManager = isOwner || membership?.role === "MODERATOR";

  return (
    <section className="bb-community-detail-shell">
      <button className="bb-community-back" type="button" onClick={onBack}><ArrowLeft size={18} /> All communities</button>
      <div className="bb-community-detail-cover" style={{ backgroundImage: `url(${selected.coverMedia?.sourceUrl || fallbackCover})` }} />
      <div className="bb-community-detail-header">
        <img className="bb-community-detail-avatar" src={selected.avatarMedia?.sourceUrl || selected.owner.profile?.avatarUrl || fallbackAvatar} alt="" />
        <div className="bb-community-detail-copy">
          <div className="bb-community-detail-title"><h1>{selected.name}</h1><span>{visibilityLabel(selected.visibility)}</span></div>
          <p>{selected.description || "A space to share and grow together."}</p>
          <div className="bb-community-detail-meta">
            <span><Users size={16} /> {selected.membersCount.toLocaleString("en-US")} members</span>
            <span><ShieldCheck size={16} /> {policyLabel(selected.joinPolicy)}</span>
            <span><CalendarDays size={16} /> Created {relativeTime(selected.createdAt)}</span>
          </div>
        </div>
        <div className="bb-community-detail-action">
          {!isLoggedIn ? (
            <Link className="bb-community-primary-btn" href="/login">Sign in to join</Link>
          ) : isManager ? (
            <div className="bb-community-manager-actions"><span className="bb-community-owner-chip"><ShieldCheck size={16} /> {isOwner ? "You own this community" : "You are a moderator"}</span><button className="bb-community-secondary-btn" type="button" onClick={onManage}><Settings size={16} /> Manage</button></div>
          ) : selected.joinPolicy === "INVITE_ONLY" && !isMember ? (
            <span className="bb-community-owner-chip"><LockKeyhole size={16} /> Invitation required</span>
          ) : (
            <button className={isMember ? "bb-community-secondary-btn" : "bb-community-primary-btn"} type="button" disabled={actionPending} onClick={onMembership}>
              {actionPending ? <LoaderCircle className="bb-spin" size={17} /> : isMember ? "Leave community" : selected.joinPolicy === "APPROVAL" ? "Request to join" : "Join community"}
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
                <textarea value={composer} onChange={(event) => onComposer(event.target.value)} maxLength={10000} placeholder={`Share something with ${selected.name}...`} />
                {postImagePreviews.length > 0 && (
                  <div className="bb-community-composer-previews">
                    {postImagePreviews.map((url, index) => <img key={url} src={url} alt={`Selected image ${index + 1}`} />)}
                  </div>
                )}
                <div className="bb-community-composer-actions">
                  <label className="bb-community-image-picker">
                    <ImagePlus size={17} /> Choose images ({postImages.length}/4)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(event) => onPostImages(Array.from(event.target.files || []))}
                    />
                  </label>
                  {postImages.length > 0 && <button className="is-secondary" type="button" onClick={() => onPostImages([])}>Remove images</button>}
                  <button type="submit" disabled={(!composer.trim() && postImages.length === 0) || actionPending}><Send size={16} /> {actionPending ? "Publishing" : "Publish post"}</button>
                </div>
              </div>
            </form>
          )}

          {feedLoading ? (
            <div className="bb-community-empty"><LoaderCircle className="bb-spin" size={25} /> Loading feed...</div>
          ) : feed.length === 0 ? (
            <div className="bb-community-empty"><MessageCircle size={32} /><strong>No posts yet</strong><span>{isMember ? "Start the first conversation." : "Come back later for new stories."}</span></div>
          ) : feed.map((post) => (
            <article className="bb-community-post" key={post.id}>
              <header>
                <img src={post.author.avatarUrl || fallbackAvatar} alt="" />
                <div><strong>{post.author.fullName}</strong><span>@{post.author.username} · {relativeTime(post.createdAt)}</span></div>
              </header>
              <p>{post.content}</p>
              {post.mediaUrls.length > 0 && <img className="bb-community-post-media" src={post.mediaUrls[0]} alt="Post content" />}
              <footer>
                <span><Heart size={17} /> {post.likesCount}</span>
                <button type="button" onClick={() => onComments(post.id)}><MessageCircle size={17} /> {post.commentsCount} comments</button>
              </footer>
            </article>
          ))}
        </div>

        <aside className="bb-community-members-panel">
          <h2>Featured members</h2>
          <div className="bb-community-owner-row">
            <img src={selected.owner.profile?.avatarUrl || fallbackAvatar} alt="" />
            <div><strong>{selected.owner.profile?.fullName || "BeeBuddy user"}</strong><span>Community owner</span></div>
          </div>
          {selected.members.filter((member) => member.userId !== selected.ownerId).slice(0, 8).map((member) => (
            <div className="bb-community-owner-row" key={member.id}>
              <img src={member.user.profile?.avatarUrl || fallbackAvatar} alt="" />
              <div><strong>{member.user.profile?.fullName || "BeeBuddy user"}</strong><span>{member.role === "MODERATOR" ? "Moderator" : "Member"}</span></div>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}

function CommunityManagementModal({ communityId, currentUserId, onClose, onUpdated, onDeleted }: {
  communityId: string;
  currentUserId: string;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  onDeleted: () => void;
}) {
  const [data, setData] = useState<CommunityManagement | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CommunityVisibility>("PUBLIC");
  const [joinPolicy, setJoinPolicy] = useState<CommunityJoinPolicy>("OPEN");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [inviteeId, setInviteeId] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [management, connectionRows] = await Promise.all([
      communitiesApi.management(communityId),
      connectionsApi.list().catch(() => []),
    ]);
    setData(management);
    setConnections(connectionRows.filter((item) => item.status === "ACCEPTED"));
    setName(management.name); setDescription(management.description || ""); setVisibility(management.visibility); setJoinPolicy(management.joinPolicy);
    setStatus(management.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE");
  }, [communityId]);
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load community management")); }, [load]);

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault(); setPending("settings"); setError(""); setNotice("");
    try {
      const [avatarAsset, coverAsset] = await Promise.all([
        avatar ? uploadImage(avatar, "avatar") : Promise.resolve(null),
        cover ? uploadImage(cover, "avatar") : Promise.resolve(null),
      ]);
      await communitiesApi.update(communityId, {
        name: name.trim(), description: description.trim() || null, visibility, joinPolicy, status,
        ...(avatarAsset ? { avatarMediaId: avatarAsset.id } : {}),
        ...(coverAsset ? { coverMediaId: coverAsset.id } : {}),
      });
      setAvatar(null); setCover(null); setNotice("Community settings saved."); await load(); await onUpdated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update the community"); }
    finally { setPending(""); }
  };

  const memberAction = async (userId: string, action: "PROMOTE" | "DEMOTE" | "REMOVE" | "BAN" | "RESTORE") => {
    if ((action === "REMOVE" || action === "BAN") && !window.confirm(action === "BAN" ? "Ban this member from the community?" : "Remove this member from the community?")) return;
    setPending(userId); setError("");
    try { await communitiesApi.manageMember(communityId, userId, action); setNotice("Member updated."); await load(); await onUpdated(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update the member"); }
    finally { setPending(""); }
  };

  const respondRequest = async (requestId: string, accept: boolean) => {
    setPending(requestId); setError("");
    try { await communitiesApi.respondJoinRequest(communityId, requestId, accept); setNotice(accept ? "Member approved." : "Request declined."); await load(); await onUpdated(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to process the request"); }
    finally { setPending(""); }
  };

  const invite = async () => {
    if (!inviteeId) return; setPending("invite"); setError("");
    try { await communitiesApi.invite(communityId, inviteeId); setNotice("Invitation sent."); setInviteeId(""); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send the invitation"); }
    finally { setPending(""); }
  };

  const transfer = async (userId: string) => {
    if (!window.confirm("Transfer ownership? You will become a regular member.")) return;
    setPending(userId); setError("");
    try { await communitiesApi.transferOwnership(communityId, userId); await onUpdated(); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to transfer ownership"); }
    finally { setPending(""); }
  };

  const removeCommunity = async () => {
    if (!window.confirm("Delete this community? Its posts will be hidden, and this action cannot be undone here.")) return;
    setPending("delete"); setError("");
    try { await communitiesApi.remove(communityId); onDeleted(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete the community"); setPending(""); }
  };

  const invitedIds = new Set(data?.invites.map((invite) => invite.inviteeId) || []);
  const memberIds = new Set(data?.members.filter((member) => member.status === "ACTIVE").map((member) => member.userId) || []);
  const candidates = connections.map((connection) => connection.requesterId === currentUserId ? connection.addressee : connection.requester)
    .filter((person) => !memberIds.has(person.id) && !invitedIds.has(person.id));

  return <div className="bb-community-modal-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}><div className="bb-community-management-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>Manage community</h2><p>Settings, members, invitations, and join requests.</p></div><button onClick={onClose}><X size={20} /></button></header>{error && <div className="bb-community-alert is-error">{error}</div>}{notice && <div className="bb-community-alert is-success">{notice}</div>}{!data ? <div className="bb-community-empty"><LoaderCircle className="bb-spin" /> Loading...</div> : <div className="bb-community-management-content">
    {data.managerRole === "OWNER" && <form className="bb-community-manage-section" onSubmit={saveSettings}><h3><Settings size={18} /> General settings</h3><div className="bb-community-form-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as "ACTIVE" | "ARCHIVED")}><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label><label>Privacy<select value={visibility} onChange={(event) => setVisibility(event.target.value as CommunityVisibility)}><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option><option value="INVITE_ONLY">Invite only</option></select></label><label>How to join<select value={joinPolicy} onChange={(event) => setJoinPolicy(event.target.value as CommunityJoinPolicy)}><option value="OPEN">Open</option><option value="APPROVAL">Approval required</option><option value="INVITE_ONLY">Invite only</option></select></label></div><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} /></label><div className="bb-community-form-grid"><label>Avatar<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setAvatar(event.target.files?.[0] || null)} /></label><label>Cover image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setCover(event.target.files?.[0] || null)} /></label></div><button className="bb-community-primary-btn" disabled={pending === "settings"}>{pending === "settings" ? "Saving..." : "Save settings"}</button></form>}
    <section className="bb-community-manage-section"><h3><UserPlus size={18} /> Invite a connection</h3><div className="bb-community-invite-row"><select value={inviteeId} onChange={(event) => setInviteeId(event.target.value)}><option value="">Select a connection</option>{candidates.map((person) => <option key={person.id} value={person.id}>{person.profile?.fullName || person.profile?.username || "Member BeeBuddy"}</option>)}</select><button disabled={!inviteeId || pending === "invite"} onClick={() => void invite()}>Send invitation</button></div>{data.invites.length > 0 && <p className="bb-community-manage-note">{data.invites.length} invitations awaiting a response.</p>}</section>
    {data.joinRequests.length > 0 && <section className="bb-community-manage-section"><h3><Users size={18} /> Join requests ({data.joinRequests.length})</h3>{data.joinRequests.map((request) => <div className="bb-community-manage-row" key={request.id}><img src={request.requester.profile?.avatarUrl || fallbackAvatar} alt="" /><div><strong>{request.requester.profile?.fullName || request.requester.email}</strong><span>{request.message || "No message"}</span></div><button disabled={pending === request.id} onClick={() => void respondRequest(request.id, true)}>Approve</button><button className="is-danger" disabled={pending === request.id} onClick={() => void respondRequest(request.id, false)}>Decline</button></div>)}</section>}
    <section className="bb-community-manage-section"><h3><Users size={18} /> Member ({data.members.filter((member) => member.status === "ACTIVE").length})</h3>{data.members.map((member) => <div className="bb-community-manage-row" key={member.id}><img src={member.user.profile?.avatarUrl || fallbackAvatar} alt="" /><div><strong>{member.user.profile?.fullName || "Member BeeBuddy"}</strong><span>{member.role} · {member.status}</span></div>{member.role !== "OWNER" && <>{data.managerRole === "OWNER" && member.status === "ACTIVE" && <button disabled={pending === member.userId} onClick={() => void memberAction(member.userId, member.role === "MODERATOR" ? "DEMOTE" : "PROMOTE")}>{member.role === "MODERATOR" ? "Demote" : "Moderator"}</button>}{data.managerRole === "OWNER" && member.status === "ACTIVE" && <button disabled={pending === member.userId} onClick={() => void transfer(member.userId)}>Transfer ownership</button>}{member.status === "ACTIVE" ? <><button className="is-danger" disabled={pending === member.userId} onClick={() => void memberAction(member.userId, "REMOVE")}><UserMinus size={14} /> Remove</button><button className="is-danger" disabled={pending === member.userId} onClick={() => void memberAction(member.userId, "BAN")}>Ban</button></> : <button disabled={pending === member.userId} onClick={() => void memberAction(member.userId, "RESTORE")}>Restore</button>}</>}</div>)}</section>
    {data.managerRole === "OWNER" && <section className="bb-community-manage-section is-danger-zone"><h3><Trash2 size={18} /> Danger zone</h3><p>Soft-delete this community and hide all its content from users.</p><button disabled={pending === "delete"} onClick={() => void removeCommunity()}>Delete community</button></section>}
  </div>}</div></div>;
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
      setError(err instanceof Error ? err.message : "Unable to create the community");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bb-community-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-community-title" onMouseDown={onClose}>
      <form className="bb-community-modal" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="bb-community-modal-head"><div><h2 id="create-community-title">Create a new community</h2><p>Build a space with a clear purpose from the start.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        {error && <div className="bb-community-alert is-error">{error}</div>}
        <label>Community name<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} required placeholder="For example: Morning runners" /></label>
        <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Who is this community for, and what will you do together?" /></label>
        <div className="bb-community-form-grid">
          <label>Privacy<select value={visibility} onChange={(event) => setVisibility(event.target.value as CommunityVisibility)}><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option><option value="INVITE_ONLY">Invite only</option></select></label>
          <label>How to join<select value={joinPolicy} onChange={(event) => setJoinPolicy(event.target.value as CommunityJoinPolicy)}><option value="OPEN">Open to all</option><option value="APPROVAL">Approval required</option><option value="INVITE_ONLY">By invitation only</option></select></label>
        </div>
        <div className="bb-community-modal-actions"><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={name.trim().length < 3 || submitting}>{submitting ? <><LoaderCircle className="bb-spin" size={17} /> Creating</> : "Create community"}</button></div>
      </form>
    </div>
  );
}
