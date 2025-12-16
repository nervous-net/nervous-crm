// Initialize Sentry first, before any other imports
import { initSentry, Sentry, captureError } from './lib/sentry.js';
initSentry();

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrf from '@fastify/csrf-protection';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from '@fastify/rate-limit';
import { config } from './lib/config.js';
import { REQUEST_LIMITS, RATE_LIMIT } from './lib/constants.js';
import { prisma } from './db/client.js';
import { authRoutes } from './api/auth/index.js';
import { usersRoutes } from './api/users/index.js';
import { teamsRoutes } from './api/teams/index.js';
import { companiesRoutes } from './api/companies/index.js';
import { contactsRoutes } from './api/contacts/index.js';
import { dealsRoutes } from './api/deals/index.js';
import { activitiesRoutes } from './api/activities/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true,
  bodyLimit: REQUEST_LIMITS.MAX_JSON_BODY_SIZE,
});

// Register plugins
fastify.register(cookie, {
  secret: config.cookieSecret,
});

fastify.register(cors, {
  origin: config.frontendUrl,
  credentials: true,
});

// CSRF protection for state-changing requests
fastify.register(csrf, {
  sessionPlugin: '@fastify/cookie',
  cookieOpts: {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
  },
});

// Rate limiting
fastify.register(rateLimit, {
  max: RATE_LIMIT.GENERAL.max,
  timeWindow: RATE_LIMIT.GENERAL.timeWindow,
});

// Global error handler - report to Sentry
fastify.setErrorHandler((error, request, reply) => {
  // Log to Sentry
  captureError(error, {
    url: request.url,
    method: request.method,
    userId: request.auth?.userId,
    teamId: request.auth?.teamId,
  });

  // Log locally
  fastify.log.error(error);

  // Send appropriate response
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'An unexpected error occurred' : error.message,
    },
  });
});

// Health check with database connectivity verification
fastify.get('/health', async () => {
  try {
    // Verify database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  } catch {
    return { status: 'degraded', database: 'disconnected' };
  }
});

// CSRF token endpoint - frontend calls this to get a token
fastify.get('/api/v1/csrf-token', {
  config: {
    rateLimit: RATE_LIMIT.CSRF_ENDPOINT,
  },
  handler: async (_request, reply) => {
    const token = await reply.generateCsrf();
    return { data: { csrfToken: token } };
  },
});

// API routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(usersRoutes, { prefix: '/api/v1/users' });
fastify.register(teamsRoutes, { prefix: '/api/v1/teams' });
fastify.register(companiesRoutes, { prefix: '/api/v1/companies' });
fastify.register(contactsRoutes, { prefix: '/api/v1/contacts' });
fastify.register(dealsRoutes, { prefix: '/api/v1/deals' });
fastify.register(activitiesRoutes, { prefix: '/api/v1/activities' });

// Serve static files in production
if (config.nodeEnv === 'production') {
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../web/dist'),
    prefix: '/',
  });

  // SPA fallback
  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api')) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    }
    return reply.sendFile('index.html');
  });
}

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    captureError(err as Error, { phase: 'startup' });
    await Sentry.flush(2000);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  await fastify.close();
  await Sentry.flush(2000);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
