import { prisma } from '../db/client.js';
import type { Prisma } from '@prisma/client';
import type { CreateContactInput, UpdateContactInput, ContactQuery } from '../shared/schemas/index.js';
import { validateTeamMember, validateTeamCompany } from '../lib/validation.js';
import { parseSort, parseIncludes } from '../lib/query-helpers.js';

const VALID_SORT_FIELDS = ['name', 'email', 'createdAt', 'updatedAt'];
const VALID_INCLUDES = ['company', 'activities', 'deals'];

export class ContactService {
  async list(teamId: string, query: ContactQuery) {
    const { search, companyId, ownerId, limit, cursor, sort, include } = query;

    const where: Prisma.ContactWhereInput = {
      teamId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(companyId && { companyId }),
      ...(ownerId && { ownerId }),
    };

    const orderBy = parseSort(sort, VALID_SORT_FIELDS);
    const includes = parseIncludes(include, VALID_INCLUDES);

    const contacts = await prisma.contact.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        ...includes,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const hasMore = contacts.length > limit;
    const data = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    const total = await prisma.contact.count({ where });

    return {
      data,
      pagination: {
        total,
        limit,
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async getById(teamId: string, id: string, include?: string) {
    const includes = parseIncludes(include, VALID_INCLUDES);

    return prisma.contact.findFirst({
      where: { id, teamId, deletedAt: null },
      include: {
        ...includes,
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { deals: true, activities: true },
        },
      },
    });
  }

  async create(teamId: string, userId: string, input: CreateContactInput) {
    // Validate ownerId belongs to team if specified
    if (input.ownerId && input.ownerId !== userId) {
      await validateTeamMember(teamId, input.ownerId);
    }

    // Validate companyId belongs to team if specified
    if (input.companyId) {
      await validateTeamCompany(teamId, input.companyId);
    }

    return prisma.contact.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        title: input.title,
        companyId: input.companyId,
        ownerId: input.ownerId || userId,
        teamId,
      },
      include: {
        company: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(teamId: string, id: string, input: UpdateContactInput) {
    const contact = await prisma.contact.findFirst({
      where: { id, teamId, deletedAt: null },
    });

    if (!contact) {
      return null;
    }

    // Validate ownerId belongs to team if being changed
    if (input.ownerId) {
      await validateTeamMember(teamId, input.ownerId);
    }

    // Validate companyId belongs to team if being changed
    if (input.companyId) {
      await validateTeamCompany(teamId, input.companyId);
    }

    return prisma.contact.update({
      where: { id },
      data: input,
      include: {
        company: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(teamId: string, id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, teamId, deletedAt: null },
    });

    if (!contact) {
      return false;
    }

    await prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}

export const contactService = new ContactService();
