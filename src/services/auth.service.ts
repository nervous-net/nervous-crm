import { prisma } from '../db/client.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../lib/jwt.js';
import type { Role } from '@prisma/client';
import type { RegisterInput, LoginInput, AcceptInviteInput } from '../shared/schemas/index.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  teamId: string;
  teamName: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AuthError('EMAIL_EXISTS', 'A user with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      // Create team first
      const team = await tx.team.create({
        data: { name: input.teamName },
      });

      // Create user as owner
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          name: input.name,
          role: 'owner',
          teamId: team.id,
        },
      });

      return { user, team };
    });

    const tokens = await this.createSession(result.user.id, result.user.teamId, result.user.role);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        teamId: result.team.id,
        teamName: result.team.name,
      },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { team: true },
    });

    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const validPassword = await verifyPassword(user.passwordHash, input.password);
    if (!validPassword) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const tokens = await this.createSession(user.id, user.teamId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        teamName: user.team.name,
      },
      tokens,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { refreshToken },
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let sessionId: string;
    try {
      const payload = await verifyRefreshToken(refreshToken);
      sessionId = payload.sessionId;
    } catch {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.refreshToken !== refreshToken) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Session not found');
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new AuthError('REFRESH_TOKEN_EXPIRED', 'Refresh token has expired');
    }

    // Rotate refresh token
    const newTokens = await this.createSession(
      session.user.id,
      session.user.teamId,
      session.user.role
    );

    // Delete old session
    await prisma.session.delete({ where: { id: session.id } });

    return newTokens;
  }

  async acceptInvite(input: AcceptInviteInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const invite = await prisma.invite.findUnique({
      where: { token: input.token },
      include: { team: true },
    });

    if (!invite) {
      throw new AuthError('INVALID_INVITE', 'Invalid invite token');
    }

    if (invite.status !== 'pending') {
      throw new AuthError('INVITE_USED', 'This invite has already been used');
    }

    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      throw new AuthError('INVITE_EXPIRED', 'This invite has expired');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AuthError('EMAIL_EXISTS', 'A user with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invite.email.toLowerCase(),
          passwordHash,
          name: input.name,
          role: invite.role,
          teamId: invite.teamId,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { status: 'accepted' },
      });

      return user;
    });

    const tokens = await this.createSession(result.id, result.teamId, result.role);

    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        teamId: invite.teamId,
        teamName: invite.team.name,
      },
      tokens,
    };
  }

  private async createSession(userId: string, teamId: string, role: Role): Promise<AuthTokens> {
    // Use transaction to ensure session creation is atomic
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          userId,
          refreshToken: '', // Temporary placeholder
          expiresAt: getRefreshTokenExpiry(),
        },
      });

      const [accessToken, refreshToken] = await Promise.all([
        createAccessToken({ userId, teamId, role }),
        createRefreshToken({ sessionId: session.id }),
      ]);

      // Update session with actual refresh token within same transaction
      await tx.session.update({
        where: { id: session.id },
        data: { refreshToken },
      });

      return { accessToken, refreshToken };
    });

    return result;
  }
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authService = new AuthService();
