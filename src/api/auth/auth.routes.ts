import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { authService, AuthError } from '../../services/auth.service.js';
import { config } from '../../lib/config.js';
import { authMiddleware } from '../../lib/auth.js';
import { auditService, AuditActions } from '../../services/audit.service.js';
import { COOKIE_MAX_AGE, RATE_LIMIT } from '../../lib/constants.js';
import {
  registerSchema,
  loginSchema,
  acceptInviteSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  type RegisterInput,
  type LoginInput,
  type AcceptInviteInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type ChangePasswordInput,
  type VerifyEmailInput,
} from '../../shared/schemas/index.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// Rate limit config for auth endpoints (stricter limits)
const authRateLimitConfig = {
  ...RATE_LIMIT.AUTH_ENDPOINTS,
  errorResponseBuilder: () => ({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please try again later.',
    },
  }),
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register rate limiting for this route group
  await fastify.register(rateLimit, RATE_LIMIT.GENERAL);
  // POST /api/v1/auth/register
  fastify.post<{ Body: RegisterInput }>(
    '/register',
    { config: { rateLimit: authRateLimitConfig } },
    async (request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
      const parseResult = registerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const { user, tokens } = await authService.register(parseResult.data);

        reply
          .setCookie('access_token', tokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
          })
          .setCookie('refresh_token', tokens.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
          });

        return { data: { user } };
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // POST /api/v1/auth/login
  fastify.post<{ Body: LoginInput }>(
    '/login',
    { config: { rateLimit: authRateLimitConfig } },
    async (request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
      const parseResult = loginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const { user, tokens } = await authService.login(parseResult.data);

        // Audit log successful login
        auditService.log({
          teamId: user.teamId,
          userId: user.id,
          action: AuditActions.USER_LOGIN,
          entityType: 'user',
          entityId: user.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        reply
          .setCookie('access_token', tokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60,
          })
          .setCookie('refresh_token', tokens.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60,
          });

        return { data: { user } };
      } catch (error) {
        if (error instanceof AuthError) {
          // Log failed login attempt
          auditService.logSecurityEvent(
            AuditActions.LOGIN_FAILED,
            { email: parseResult.data.email, reason: error.code },
            request.ip,
            request.headers['user-agent']
          );

          return reply.status(401).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // POST /api/v1/auth/logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refresh_token;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    reply
      .clearCookie('access_token', COOKIE_OPTIONS)
      .clearCookie('refresh_token', COOKIE_OPTIONS);

    return { data: { message: 'Logged out successfully' } };
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refresh_token;
    if (!refreshToken) {
      return reply.status(401).send({
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided' },
      });
    }

    try {
      const tokens = await authService.refresh(refreshToken);

      reply
        .setCookie('access_token', tokens.accessToken, {
          ...COOKIE_OPTIONS,
          maxAge: 15 * 60,
        })
        .setCookie('refresh_token', tokens.refreshToken, {
          ...COOKIE_OPTIONS,
          maxAge: 7 * 24 * 60 * 60,
        });

      return { data: { message: 'Tokens refreshed successfully' } };
    } catch (error) {
      if (error instanceof AuthError) {
        reply
          .clearCookie('access_token', COOKIE_OPTIONS)
          .clearCookie('refresh_token', COOKIE_OPTIONS);

        return reply.status(401).send({
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/accept-invite
  fastify.post<{ Body: AcceptInviteInput }>(
    '/accept-invite',
    { config: { rateLimit: authRateLimitConfig } },
    async (request: FastifyRequest<{ Body: AcceptInviteInput }>, reply: FastifyReply) => {
      const parseResult = acceptInviteSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const { user, tokens } = await authService.acceptInvite(parseResult.data);

        reply
          .setCookie('access_token', tokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60,
          })
          .setCookie('refresh_token', tokens.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60,
          });

        return { data: { user } };
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // POST /api/v1/auth/request-password-reset
  fastify.post<{ Body: RequestPasswordResetInput }>(
    '/request-password-reset',
    { config: { rateLimit: authRateLimitConfig } },
    async (request: FastifyRequest<{ Body: RequestPasswordResetInput }>, reply: FastifyReply) => {
      const parseResult = requestPasswordResetSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      // Always return success to prevent email enumeration
      const { token } = await authService.requestPasswordReset(parseResult.data);

      // In production, don't return token - send via email instead
      // For development, return it so frontend can construct reset link
      return {
        data: {
          message: 'If an account exists with this email, a password reset link has been sent.',
          ...(config.nodeEnv !== 'production' && { token }),
        },
      };
    }
  );

  // POST /api/v1/auth/reset-password
  fastify.post<{ Body: ResetPasswordInput }>(
    '/reset-password',
    { config: { rateLimit: authRateLimitConfig } },
    async (request: FastifyRequest<{ Body: ResetPasswordInput }>, reply: FastifyReply) => {
      const parseResult = resetPasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      try {
        await authService.resetPassword(parseResult.data);
        return { data: { message: 'Password has been reset successfully. Please log in.' } };
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // POST /api/v1/auth/change-password (requires authentication)
  fastify.post<{ Body: ChangePasswordInput }>(
    '/change-password',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: ChangePasswordInput }>, reply: FastifyReply) => {
      const parseResult = changePasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      try {
        await authService.changePassword(request.auth!.userId, parseResult.data);

        // Audit log password change
        auditService.log({
          teamId: request.auth!.teamId,
          userId: request.auth!.userId,
          action: AuditActions.PASSWORD_CHANGE,
          entityType: 'user',
          entityId: request.auth!.userId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return { data: { message: 'Password changed successfully' } };
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // POST /api/v1/auth/verify-email
  fastify.post<{ Body: VerifyEmailInput }>(
    '/verify-email',
    async (request: FastifyRequest<{ Body: VerifyEmailInput }>, reply: FastifyReply) => {
      const parseResult = verifyEmailSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      try {
        await authService.verifyEmail(parseResult.data.token);
        return { data: { message: 'Email verified successfully' } };
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // POST /api/v1/auth/resend-verification (requires authentication)
  fastify.post(
    '/resend-verification',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { token } = await authService.resendVerificationEmail(request.auth!.userId);

        // In production, don't return token - send via email instead
        return {
          data: {
            message: 'Verification email has been sent.',
            ...(config.nodeEnv !== 'production' && { token }),
          },
        };
      } catch (error) {
        if (error instanceof AuthError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );
}
