import { CommunityMemberStatus, CommunityVisibility, PostStatus, PostVisibility, Prisma } from "@prisma/client";

export function buildVisiblePostWhere(
  currentUserId?: string,
  connectedUserIds: string[] = [],
  blockedUserIds: string[] = []
): Prisma.PostWhereInput {
  if (!currentUserId) {
    return {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      audience: PostVisibility.PUBLIC,
      OR: [
        { communityId: null },
        { community: { is: { visibility: CommunityVisibility.PUBLIC } } },
      ],
    };
  }

  const visible: Prisma.PostWhereInput = {
    status: PostStatus.PUBLISHED,
    deletedAt: null,
    OR: [
      { audience: PostVisibility.PUBLIC },
      { authorId: currentUserId },
      {
        audience: PostVisibility.CONNECTIONS,
        authorId: { in: connectedUserIds },
      },
      {
        audience: PostVisibility.SELECTED,
        audienceUsers: { some: { userId: currentUserId } },
      },
      {
        audience: PostVisibility.CUSTOM,
        OR: [
          { audienceUsers: { some: { userId: currentUserId } } },
          {
            audienceLists: {
              some: {
                audienceList: { members: { some: { userId: currentUserId } } },
              },
            },
          },
        ],
        excludedUsers: { none: { userId: currentUserId } },
      },
    ],
    AND: [{
      OR: [
        { communityId: null },
        { community: { is: { visibility: CommunityVisibility.PUBLIC } } },
        { community: { is: { members: { some: { userId: currentUserId, status: CommunityMemberStatus.ACTIVE } } } } },
      ],
    }],
  };

  return blockedUserIds.length
    ? { AND: [visible, { authorId: { notIn: blockedUserIds } }] }
    : visible;
}

export function canViewPost(params: {
  visibility: PostVisibility;
  authorId: string;
  currentUserId?: string;
  isConnected?: boolean;
  isSelectedRecipient?: boolean;
  isCustomAudienceMember?: boolean;
  isExcluded?: boolean;
}) {
  if (params.visibility === PostVisibility.PUBLIC) return true;
  if (!params.currentUserId) return false;
  if (params.authorId === params.currentUserId) return true;
  if (params.isExcluded) return false;
  if (params.visibility === PostVisibility.CONNECTIONS) return Boolean(params.isConnected);
  if (params.visibility === PostVisibility.SELECTED) return Boolean(params.isSelectedRecipient);
  if (params.visibility === PostVisibility.CUSTOM) return Boolean(params.isCustomAudienceMember);
  return false;
}
