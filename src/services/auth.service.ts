import { prisma } from '../db/client.js';
import { Prisma } from '@prisma/client';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../lib/jwt.js';
import {
  generateSecureToken,
  getPasswordResetExpiry,
  getEmailVerificationExpiry,
} from '../lib/tokens.js';
import type { Role } from '@prisma/client';
import type {
  RegisterInput,
  LoginInput,
  AcceptInviteInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '../shared/schemas/index.js';

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
    const passwordHash = await hashPassword(input.password);

    try {
      // Use transaction and rely on DB unique constraint for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create team first
        const team = await tx.team.create({
          data: { name: input.teamName },
        });

        // Create user as owner - unique constraint will prevent duplicates
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
    } catch (error) {
      // Handle unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AuthError('EMAIL_EXISTS', 'A user with this email already exists');
      }
      throw error;
    }
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

    const passwordHash = await hashPassword(input.password);

    try {
      // Use transaction and rely on DB unique constraint for atomicity
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
    } catch (error) {
      // Handle unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AuthError('EMAIL_EXISTS', 'A user with this email already exists');
      }
      throw error;
    }
  }

  // Password Reset Methods

  async requestPasswordReset(input: RequestPasswordResetInput): Promise<{ token: string }> {
    const email = input.email.toLowerCase();

    // Check if user exists (don't reveal if they don't for security)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      // Return a fake token - the reset will fail silently
      return { token: generateSecureToken() };
    }

    // Invalidate any existing reset tokens for this email
    await prisma.passwordReset.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new reset token
    const token = generateSecureToken();
    await prisma.passwordReset.create({
      data: {
        email,
        token,
        expiresAt: getPasswordResetExpiry(),
      },
    });

    // In production, you would send an email here
    // For now, return the token (frontend can construct the reset link)
    return { token };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const reset = await prisma.passwordReset.findUnique({
      where: { token: input.token },
    });

    if (!reset) {
      throw new AuthError('INVALID_RESET_TOKEN', 'Invalid or expired reset token');
    }

    if (reset.usedAt) {
      throw new AuthError('RESET_TOKEN_USED', 'This reset token has already been used');
    }

    if (reset.expiresAt < new Date()) {
      throw new AuthError('RESET_TOKEN_EXPIRED', 'This reset token has expired');
    }

    const user = await prisma.user.findUnique({
      where: { email: reset.email },
    });

    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'User not found');
    }

    const passwordHash = await hashPassword(input.password);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all existing sessions for security
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'User not found');
    }

    const validPassword = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!validPassword) {
      throw new AuthError('INVALID_PASSWORD', 'Current password is incorrect');
    }

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // Email Verification Methods

  async createEmailVerification(userId: string): Promise<{ token: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'User not found');
    }

    if (user.emailVerified) {
      throw new AuthError('ALREADY_VERIFIED', 'Email is already verified');
    }

    // Invalidate any existing verification tokens
    await prisma.emailVerification.updateMany({
      where: { userId, verifiedAt: null },
      data: { verifiedAt: new Date() },
    });

    const token = generateSecureToken();
    await prisma.emailVerification.create({
      data: {
        userId,
        token,
        expiresAt: getEmailVerificationExpiry(),
      },
    });

    // In production, you would send an email here
    return { token };
  }

  async verifyEmail(token: string): Promise<void> {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new AuthError('INVALID_VERIFICATION_TOKEN', 'Invalid verification token');
    }

    if (verification.verifiedAt) {
      throw new AuthError('TOKEN_ALREADY_USED', 'This verification token has already been used');
    }

    if (verification.expiresAt < new Date()) {
      throw new AuthError('VERIFICATION_TOKEN_EXPIRED', 'This verification token has expired');
    }

    if (verification.user.emailVerified) {
      throw new AuthError('ALREADY_VERIFIED', 'Email is already verified');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() },
      }),
    ]);
  }

  async resendVerificationEmail(userId: string): Promise<{ token: string }> {
    return this.createEmailVerification(userId);
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
