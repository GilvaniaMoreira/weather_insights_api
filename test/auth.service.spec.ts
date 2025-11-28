import { JwtService } from '@nestjs/jwt';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

vi.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: { user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    jwtService = {
      sign: vi.fn(),
    };

    service = new AuthService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashed_password';

      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);
      prismaService.user.create.mockResolvedValue({
        id: '1',
        email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register(email, password);

      expect(result).toEqual({
        id: '1',
        email,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: { email, password: hashedPassword },
      });
    });

    it('should throw error if user already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.register('test@example.com', 'password')).rejects.toThrow(
        'User already exists',
      );
    });
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user = {
        id: '1',
        email,
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as any).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login(email, password);

      expect(result).toEqual({
        access_token: 'jwt_token',
        user: {
          id: user.id,
          email: user.email
        }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password);
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email });
    });

    it('should throw error for invalid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error for wrong password', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user data for valid credentials', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual({ id: '1', email: 'test@example.com', createdAt: user.createdAt, updatedAt: user.updatedAt });
    });

    it('should throw error for invalid user', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('invalid@example.com', 'password')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });
});
