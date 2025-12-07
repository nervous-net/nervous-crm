import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { authService, AuthError } from '../../services/auth.service.js';
import { config } from '../../lib/config.js';
import {
  registerSchema,
  loginSchema,
  acceptInviteSchema,
  type RegisterInput,
  type LoginInput,
  type AcceptInviteInput,
} from '../../shared/schemas/index.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// Rate limit config for auth endpoints (stricter limits)
const authRateLimitConfig = {
  max: 5, // 5 attempts
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please try again later.',
    },
  }),
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register rate limiting for this route group
  await fastify.register(rateLimit, {
    max: 100, // Default: 100 requests per minute for general auth endpoints
    timeWindow: '1 minute',
  });
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
            maxAge: 15 * 60, // 15 minutes
          })
          .setCookie('refresh_token', tokens.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60, // 7 days
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
}
