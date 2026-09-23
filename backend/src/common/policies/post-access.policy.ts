import { PostVisibility, Prisma } from "@prisma/client";

export function buildVisiblePostWhere(
  currentUserId?: string,
  connectedUserIds: string[] = []
): Prisma.PostWhereInput {
  if (!currentUserId) {
    return { visibility: PostVisibility.PUBLIC };
  }

  return {
    OR: [
      { visibility: PostVisibility.PUBLIC },
      { authorId: currentUserId },
      {
        visibility: PostVisibility.CONNECTIONS,
        authorId: { in: connectedUserIds },
      },
    ],
  };
}

export function canViewPost(params: {
  visibility: PostVisibility;
  authorId: string;
  currentUserId?: string;
  isConnected?: boolean;
}) {
  if (params.visibility === PostVisibility.PUBLIC) return true;
  if (!params.currentUserId) return false;
  if (params.authorId === params.currentUserId) return true;
  return params.visibility === PostVisibility.CONNECTIONS && Boolean(params.isConnected);
}
