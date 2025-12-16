import { prisma } from '../db/client.js';

export class ValidationError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates that a user belongs to the specified team.
 * Used to prevent assigning ownership to users outside the team.
 */
export async function validateTeamMember(teamId: string, userId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, teamId },
    select: { id: true },
  });

  if (!user) {
    throw new ValidationError('INVALID_OWNER', 'The specified owner does not belong to this team');
  }
}

/**
 * Validates that a company belongs to the specified team.
 */
export async function validateTeamCompany(teamId: string, companyId: string): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, teamId, deletedAt: null },
    select: { id: true },
  });

  if (!company) {
    throw new ValidationError('INVALID_COMPANY', 'The specified company does not belong to this team');
  }
}

/**
 * Validates that a contact belongs to the specified team.
 */
export async function validateTeamContact(teamId: string, contactId: string): Promise<void> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, teamId, deletedAt: null },
    select: { id: true },
  });

  if (!contact) {
    throw new ValidationError('INVALID_CONTACT', 'The specified contact does not belong to this team');
  }
}

/**
 * Validates that a deal belongs to the specified team.
 */
export async function validateTeamDeal(teamId: string, dealId: string): Promise<void> {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, teamId, deletedAt: null },
    select: { id: true },
  });

  if (!deal) {
    throw new ValidationError('INVALID_DEAL', 'The specified deal does not belong to this team');
  }
}
