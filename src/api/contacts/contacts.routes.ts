import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../../lib/auth.js';
import { contactService } from '../../services/contact.service.js';
import { ValidationError } from '../../lib/validation.js';
import {
  createContactSchema,
  updateContactSchema,
  contactQuerySchema,
  type CreateContactInput,
  type UpdateContactInput,
} from '../../shared/schemas/index.js';

export async function contactsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // GET /api/v1/contacts
  fastify.get(
    '/',
    async (request: FastifyRequest<{ Querystring: Record<string, string> }>, reply: FastifyReply) => {
      const parseResult = contactQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
        });
      }

      const result = await contactService.list(request.auth!.teamId, parseResult.data);
      return result;
    }
  );

  // GET /api/v1/contacts/:id
  fastify.get<{ Params: { id: string }; Querystring: { include?: string } }>(
    '/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { include?: string } }>,
      reply: FastifyReply
    ) => {
      const contact = await contactService.getById(
        request.auth!.teamId,
        request.params.id,
        request.query.include
      );

      if (!contact) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Contact not found' },
        });
      }

      return { data: contact };
    }
  );

  // POST /api/v1/contacts
  fastify.post<{ Body: CreateContactInput }>(
    '/',
    async (request: FastifyRequest<{ Body: CreateContactInput }>, reply: FastifyReply) => {
      const parseResult = createContactSchema.safeParse(request.body);
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
        const contact = await contactService.create(
          request.auth!.teamId,
          request.auth!.userId,
          parseResult.data
        );
        return reply.status(201).send({ data: contact });
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // PUT /api/v1/contacts/:id
  fastify.put<{ Params: { id: string }; Body: UpdateContactInput }>(
    '/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateContactInput }>,
      reply: FastifyReply
    ) => {
      const parseResult = updateContactSchema.safeParse(request.body);
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
        const contact = await contactService.update(
          request.auth!.teamId,
          request.params.id,
          parseResult.data
        );

        if (!contact) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Contact not found' },
          });
        }

        return { data: contact };
      } catch (error) {
        if (error instanceof ValidationError) {
          return reply.status(400).send({
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    }
  );

  // DELETE /api/v1/contacts/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const deleted = await contactService.delete(request.auth!.teamId, request.params.id);

      if (!deleted) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Contact not found' },
        });
      }

      return { data: { message: 'Contact deleted' } };
    }
  );
}
