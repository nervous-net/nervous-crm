import { prisma } from '../db/client.js';
import type { Prisma } from '@prisma/client';

export interface AuditLogEntry {
  teamId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: string;
}

export class AuditService {
  /**
   * Creates an audit log entry. This is a fire-and-forget operation
   * that should not block the main request.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          teamId: entry.teamId,
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      // Log errors but don't throw - audit logging shouldn't break the app
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Query audit logs for a team
   */
  async query(teamId: string, query: AuditLogQuery = {}) {
    const {
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      limit = 50,
      cursor,
    } = query;

    const where = {
      teamId,
      ...(action && { action }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = logs.length > limit;
    const data = hasMore ? logs.slice(0, -1) : logs;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return {
      data,
      pagination: {
        limit,
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(teamId: string, entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: {
        teamId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

export const auditService = new AuditService();

// Common audit action constants
export const AuditActions = {
  // Auth
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  PASSWORD_RESET_REQUEST: 'user.password_reset_request',
  PASSWORD_RESET: 'user.password_reset',
  PASSWORD_CHANGE: 'user.password_change',
  EMAIL_VERIFIED: 'user.email_verified',

  // Team
  TEAM_UPDATE: 'team.update',
  MEMBER_INVITE: 'team.member_invite',
  MEMBER_REMOVE: 'team.member_remove',
  MEMBER_ROLE_CHANGE: 'team.member_role_change',

  // Contacts
  CONTACT_CREATE: 'contact.create',
  CONTACT_UPDATE: 'contact.update',
  CONTACT_DELETE: 'contact.delete',

  // Companies
  COMPANY_CREATE: 'company.create',
  COMPANY_UPDATE: 'company.update',
  COMPANY_DELETE: 'company.delete',

  // Deals
  DEAL_CREATE: 'deal.create',
  DEAL_UPDATE: 'deal.update',
  DEAL_DELETE: 'deal.delete',
  DEAL_STAGE_CHANGE: 'deal.stage_change',

  // Activities
  ACTIVITY_CREATE: 'activity.create',
  ACTIVITY_UPDATE: 'activity.update',
  ACTIVITY_DELETE: 'activity.delete',
  ACTIVITY_COMPLETE: 'activity.complete',
} as const;
