import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisCacheService } from '../src/common/utils/redis-cache.service';
import { WeatherEntity } from '../src/weather/weather.entity';
import { WeatherRepository } from '../src/weather/weather.repository';
import { WeatherService } from '../src/weather/weather.service';

describe('WeatherService', () => {
  let service: WeatherService;
  let weatherRepository: { create: ReturnType<typeof vi.fn>; findManyByCity: ReturnType<typeof vi.fn>; countByCity: ReturnType<typeof vi.fn> };
  let redisCacheService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let httpService: { get: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    weatherRepository = {
      create: vi.fn(),
      findManyByCity: vi.fn(),
      countByCity: vi.fn(),
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

    service = new WeatherService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
      weatherRepository as unknown as WeatherRepository,
      redisCacheService as unknown as RedisCacheService,
    );
  });

  it('returns cached weather data when available', async () => {
    const cachedRecord = new WeatherEntity({
      id: 1,
      city: 'São Paulo',
      condition: 'sunny',
      temperature: 28,
      recordedAt: new Date(),
    });

    redisCacheService.get.mockResolvedValue(cachedRecord);

    const result = await service.getCurrentWeather('São Paulo');

    expect(result.city).toBe('São Paulo');
    expect(httpService.get).not.toHaveBeenCalled();
    expect(weatherRepository.create).not.toHaveBeenCalled();
    expect(redisCacheService.set).not.toHaveBeenCalled();
  });

  it('fetches weather data from API, persists, and caches when not cached', async () => {
    const apiResponse = {
      data: {
        name: 'São Paulo',
        main: { temp: 30 },
        weather: [{ description: 'clear sky' }],
      },
    };

    redisCacheService.get.mockResolvedValue(null);
    httpService.get.mockReturnValue(of(apiResponse));
    weatherRepository.create.mockResolvedValue({
      id: 10,
      city: 'São Paulo',
      temperature: 30,
      condition: 'clear sky',
      recordedAt: new Date(),
    });

    const result = await service.getCurrentWeather('São Paulo');

    expect(result.temperature).toBe(30);
    expect(weatherRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'São Paulo',
        condition: 'clear sky',
        temperature: 30,
      }),
    );
    expect(redisCacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('weather:current:são paulo'),
      expect.any(WeatherEntity),
      600,
    );
  });

  it('throws when OpenWeatherMap returns an error', async () => {
    redisCacheService.get.mockResolvedValue(null);
    httpService.get.mockReturnValue(
      throwError(() => new AxiosError('City not found', '404')),
    );

    await expect(service.getCurrentWeather('Unknown')).rejects.toThrow('Weather data not found');
    expect(weatherRepository.create).not.toHaveBeenCalled();
  });

  it('calculates weekly summary from repository records', async () => {
    const now = new Date();
    weatherRepository.findManyByCity.mockResolvedValue([
      { id: 1, city: 'São Paulo', temperature: 20, condition: 'rain', recordedAt: now },
      { id: 2, city: 'São Paulo', temperature: 30, condition: 'sunny', recordedAt: now },
      { id: 3, city: 'São Paulo', temperature: 25, condition: 'cloudy', recordedAt: now },
    ]);

    const summary = await service.getWeeklySummary('São Paulo');

    expect(summary).toEqual({
      city: 'São Paulo',
      averageTemp: 25,
      maxTemp: 30,
      minTemp: 20,
    });
    expect(weatherRepository.findManyByCity).toHaveBeenCalledWith('São Paulo', {
      since: expect.any(Date),
    });
  });

  it('throws when no history available for summary', async () => {
    weatherRepository.findManyByCity.mockResolvedValue([]);

    await expect(service.getWeeklySummary('City')).rejects.toThrow('No weather history available');
  });

  it('returns stored history records as entities', async () => {
    const date = new Date();
    weatherRepository.findManyByCity.mockResolvedValue([
      { id: 1, city: 'São Paulo', temperature: 22, condition: 'clouds', recordedAt: date },
    ]);
    weatherRepository.countByCity.mockResolvedValue(1);

    const result = await service.getHistory('São Paulo');

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toBeInstanceOf(WeatherEntity);
    expect(result.total).toBe(1);
  });

  it('throws when no history exists for a city', async () => {
    weatherRepository.findManyByCity.mockResolvedValue([]);
    weatherRepository.countByCity.mockResolvedValue(0);

    await expect(service.getHistory('Nowhere')).rejects.toThrow('No weather history available');
  });
});
