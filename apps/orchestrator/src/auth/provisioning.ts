import { prisma } from '@fivem-ai/db';
import type { AuthUser } from './index';

interface CacheEntry {
  user: AuthUser;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

/**
 * Resolve a verified Clerk user id to our tenancy model:
 * - `userId` stays the stable clerkUserId
 * - `orgId` comes from the provisioned AppUser row (NEVER from JWT claims)
 * - `appId` is the internal AppUser.id
 *
 * Auto-provisions an Organization + AppUser on first sight. Concurrent first
 * logins are handled via P2002 catch-and-re-read.
 */
export async function resolveUser(clerkUserId: string, email?: string | null): Promise<AuthUser> {
  const hit = cache.get(clerkUserId);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.user;
  }

  const existing = await prisma.appUser.findUnique({ where: { clerkUserId } });
  if (existing) {
    const user: AuthUser = {
      userId: clerkUserId,
      appId: existing.id,
      orgId: existing.organizationId,
      email: email ?? existing.email ?? '',
      role: 'developer',
    };
    cache.set(clerkUserId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
  }

  // First login for this Clerk user — provision workspace + membership.
  try {
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: email ? `${email}'s Workspace` : `org-${clerkUserId.slice(-8)}`,
          plan_tier: 'starter',
        },
      });
      return tx.appUser.create({
        data: {
          clerkUserId,
          email: email ?? null,
          organizationId: org.id,
        },
      });
    });

    const user: AuthUser = {
      userId: clerkUserId,
      appId: result.id,
      orgId: result.organizationId,
      email: email ?? result.email ?? '',
      role: 'developer',
    };
    cache.set(clerkUserId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
  } catch (error: any) {
    // P2002 = unique constraint violation on clerkUserId — another concurrent
    // request won provisioning. Re-read and return the winner's row.
    if (error?.code === 'P2002') {
      const winner = await prisma.appUser.findUnique({ where: { clerkUserId } });
      if (winner) {
        const user: AuthUser = {
          userId: clerkUserId,
          appId: winner.id,
          orgId: winner.organizationId,
          email: email ?? winner.email ?? '',
          role: 'developer',
        };
        cache.set(clerkUserId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
        return user;
      }
    }
    throw error;
  }
}

/** Test helper: drop one user (or all users) from the provisioning cache. */
export function clearUserCache(clerkUserId?: string): void {
  if (clerkUserId) {
    cache.delete(clerkUserId);
  } else {
    cache.clear();
  }
}
