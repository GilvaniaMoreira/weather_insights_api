import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import { of } from 'rxjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { RedisCacheService } from '../src/common/utils/redis-cache.service';
import { WeatherEntity } from '../src/weather/weather.entity';
import { WeatherRepository } from '../src/weather/weather.repository';
import { WeatherService } from '../src/weather/weather.service';
import { WeatherController } from '../src/weather/weather.controller';

describe('WeatherController (routes)', () => {
  let app: Express;
  let weatherRepository: { create: ReturnType<typeof vi.fn>; findManyByCity: ReturnType<typeof vi.fn> };
  let redisCacheService: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let httpService: { get: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };
  let weatherService: WeatherService;
  let controller: WeatherController;

  beforeEach(async () => {
    weatherRepository = {
      create: vi.fn(),
      findManyByCity: vi.fn(),
    };

    redisCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    httpService = {
      get: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'OPENWEATHER_API_KEY') {
          return 'test-api-key';
        }
        if (key === 'OPENWEATHER_BASE_URL') {
          return 'https://api.test.openweathermap';
        }
        return defaultValue;
      }),
    };

    weatherService = new WeatherService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
      weatherRepository as unknown as WeatherRepository,
      redisCacheService as unknown as RedisCacheService,
    );

    controller = new WeatherController(weatherService);

    app = express();
    app.use(express.json());
    app.get('/weather/:city', (req: Request, res: Response) =>
      handleRequest(res, () => controller.getCurrentWeather(req.params.city)),
    );
    app.get('/weather/summary/:city', (req: Request, res: Response) =>
      handleRequest(res, () => controller.getWeatherSummary(req.params.city)),
    );
    app.get('/weather/history/:city', (req: Request, res: Response) =>
      handleRequest(res, () => controller.getWeatherHistory(req.params.city)),
    );
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('GET /weather/:city responds with current weather and caches result', async () => {
    redisCacheService.get.mockResolvedValue(null);
    httpService.get.mockReturnValue(
      of({
        data: {
          name: 'São Paulo',
          main: { temp: 26 },
          weather: [{ description: 'scattered clouds' }],
        },
      }),
    );
    const recordedAt = new Date();
    weatherRepository.create.mockResolvedValue({
      id: 1,
      city: 'São Paulo',
      temperature: 26,
      condition: 'scattered clouds',
      recordedAt,
    });

    const response = await request(app).get('/weather/Sao Paulo');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      city: 'São Paulo',
      temperature: 26,
      condition: 'scattered clouds',
    });
    expect(redisCacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('weather:current:sao paulo'),
      expect.any(WeatherEntity),
      600,
    );
  });

  it('GET /weather/summary/:city returns weekly summary', async () => {
    const now = new Date();
    weatherRepository.findManyByCity.mockResolvedValue([
      { id: 1, city: 'São Paulo', temperature: 22, condition: 'rain', recordedAt: now },
      { id: 2, city: 'São Paulo', temperature: 28, condition: 'sunny', recordedAt: now },
    ]);

    const response = await request(app).get('/weather/summary/Sao Paulo');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      city: 'São Paulo',
      averageTemp: 25,
      maxTemp: 28,
      minTemp: 22,
    });
  });

  it('GET /weather/history/:city returns persisted records', async () => {
    const recordedAt = new Date();
    weatherRepository.findManyByCity.mockResolvedValue([
      { id: 1, city: 'São Paulo', temperature: 25, condition: 'sunny', recordedAt },
      { id: 2, city: 'São Paulo', temperature: 24, condition: 'cloudy', recordedAt },
    ]);

    const response = await request(app).get('/weather/history/Sao Paulo');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      city: 'São Paulo',
      temperature: 25,
      condition: 'sunny',
    });
  });
});

async function handleRequest(res: Response, handler: () => Promise<unknown>): Promise<void> {
  try {
    const result = await handler();
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpException) {
      res.status(error.getStatus()).json(error.getResponse());
      return;
    }
    res.status(500).json({ message: (error as Error).message });
  }
}
