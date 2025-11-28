import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

vi.mock('@nestjs/config');

describe.skip('Weather API E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: vi.fn((key: string) => {
          const config: Record<string, string> = {
            OPENWEATHER_API_KEY: 'test-api-key',
            OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',
            JWT_SECRET: 'test-secret',
            JWT_EXPIRATION: '1h',
            REDIS_HOST: 'localhost',
            REDIS_PORT: '6379',
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          };
          return config[key];
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    await prisma.weatherRecord.deleteMany();
    await prisma.user.deleteMany();

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e@test.com',
        password: 'Test123!@#',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'e2e@test.com',
        password: 'Test123!@#',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.weatherRecord.deleteMany();
      await prisma.user.deleteMany();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Auth Endpoints', () => {
    it('/auth/register (POST) - should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('newuser@test.com');
    });

    it('/auth/register (POST) - should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e@test.com',
          password: 'Test123!@#',
        })
        .expect(400);
    });

    it('/auth/login (POST) - should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e@test.com',
          password: 'Test123!@#',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
    });

    it('/auth/login (POST) - should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e@test.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Weather Endpoints', () => {
    it('/weather/:city (GET) - should return current weather', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/London')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('city');
      expect(response.body).toHaveProperty('temperature');
      expect(response.body).toHaveProperty('condition');
      expect(response.body).toHaveProperty('recordedAt');
    });

    it('/weather/:city (GET) - should fail without auth token', async () => {
      await request(app.getHttpServer())
        .get('/weather/London')
        .expect(401);
    });

    it('/weather/:city (GET) - should validate city name format', async () => {
      await request(app.getHttpServer())
        .get('/weather/123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('/weather/summary/:city (GET) - should return weekly summary', async () => {
      await request(app.getHttpServer())
        .get('/weather/London')
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app.getHttpServer())
        .get('/weather/summary/London')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('city');
      expect(response.body).toHaveProperty('averageTemp');
      expect(response.body).toHaveProperty('maxTemp');
      expect(response.body).toHaveProperty('minTemp');
    });

    it('/weather/history/:city (GET) - should return paginated history', async () => {
      await request(app.getHttpServer())
        .get('/weather/Paris')
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app.getHttpServer())
        .get('/weather/history/Paris?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('/weather/history/:city (GET) - should use default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/weather/history/Paris')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });
  });
});
