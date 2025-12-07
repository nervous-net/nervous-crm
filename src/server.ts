import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrf from '@fastify/csrf-protection';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './lib/config.js';
import { REQUEST_LIMITS } from './lib/constants.js';
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
    sameSite: 'lax',
    path: '/',
  },
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// CSRF token endpoint - frontend calls this to get a token
fastify.get('/api/v1/csrf-token', async (_request, reply) => {
  const token = await reply.generateCsrf();
  return { data: { csrfToken: token } };
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
    process.exit(1);
  }
};

start();
