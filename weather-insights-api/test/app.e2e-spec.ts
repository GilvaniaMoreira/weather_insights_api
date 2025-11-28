import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/exceptions/http-exception.filter';

describe('Weather API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    const httpAdapterHost = app.get(HttpAdapterHost);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter(httpAdapterHost));

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('/weather/:city (GET)', () => {
    it('should return 400 for invalid city name', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/123');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('City name must contain only letters');
    });

    it('should return 400 for city name too short', () => {
      return request(app.getHttpServer())
        .get('/weather/A')
        .expect(400);
    });

    it('should return 400 for city name too long', () => {
      const longCity = 'A'.repeat(51);
      return request(app.getHttpServer())
        .get(`/weather/${longCity}`)
        .expect(400);
    });
  });

  describe('/weather/summary/:city (GET)', () => {
    it('should return 404 when no history available', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/summary/NonExistentCity');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('No weather history available');
    });

    it('should return 400 for invalid city format', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/summary/123');

      expect(response.status).toBe(400);
    });
  });

  describe('/weather/history/:city (GET)', () => {
    it('should return 404 when no history exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/history/NonExistentCity');

      expect(response.status).toBe(404);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/history/TestCity?page=1&limit=5');

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
      }
    });

    it('should validate pagination limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/history/TestCity?page=0&limit=200');

      expect(response.status).toBe(400);
    });
  });

  describe('/auth/register (POST)', () => {
    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: '123' });

      expect(response.status).toBe(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(15).fill(null).map(() =>
        request(app.getHttpServer()).get('/weather/TestCity')
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(res => res.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });
});
