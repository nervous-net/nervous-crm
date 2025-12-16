import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/client.js';
import { authMiddleware } from '../../lib/auth.js';
import { updateProfileSchema, type UpdateProfileInput } from '../../shared/schemas/index.js';
import { auditService, AuditActions } from '../../services/audit.service.js';

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/users/me
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return { data: user };
  });

  // PUT /api/v1/users/me
  fastify.put<{ Body: UpdateProfileInput }>(
    '/me',
    async (request: FastifyRequest<{ Body: UpdateProfileInput }>, reply: FastifyReply) => {
      const parseResult = updateProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const { email, name } = parseResult.data;

      // Check email uniqueness if changing
      if (email) {
        const existing = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
            id: { not: request.auth!.userId },
          },
        });

        if (existing) {
          return reply.status(400).send({
            error: { code: 'EMAIL_EXISTS', message: 'Email is already in use' },
          });
        }
      }

      const user = await prisma.user.update({
        where: { id: request.auth!.userId },
        data: {
          ...(email && { email: email.toLowerCase() }),
          ...(name && { name }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          teamId: true,
        },
      });

      // Audit log profile update
      auditService.log({
        teamId: request.auth!.teamId,
        userId: request.auth!.userId,
        action: AuditActions.PROFILE_UPDATE,
        entityType: 'user',
        entityId: request.auth!.userId,
        metadata: {
          emailChanged: !!email,
          nameChanged: !!name,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return { data: user };
    }
  );
}
