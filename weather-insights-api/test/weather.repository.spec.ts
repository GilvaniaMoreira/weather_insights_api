import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherRepository, CreateWeatherRecordInput } from '../src/weather/weather.repository';
import { PrismaService } from '../src/prisma/prisma.service';

describe('WeatherRepository', () => {
  let repository: WeatherRepository;
  let prismaService: {
    weatherRecord: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prismaService = {
      weatherRecord: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    repository = new WeatherRepository(prismaService as unknown as PrismaService);
  });

  describe('create', () => {
    it('should create a weather record', async () => {
      const input: CreateWeatherRecordInput = {
        city: 'São Paulo',
        temperature: 25,
        condition: 'sunny',
        recordedAt: new Date(),
      };

      const expected = { id: 1, ...input };
      prismaService.weatherRecord.create.mockResolvedValue(expected);

      const result = await repository.create(input);

      expect(result).toEqual(expected);
      expect(prismaService.weatherRecord.create).toHaveBeenCalledWith({ data: input });
    });
  });

  describe('findManyByCity', () => {
    it('should find records by city with case insensitive search', async () => {
      const records = [
        { id: 1, city: 'São Paulo', temperature: 25, condition: 'sunny', recordedAt: new Date() },
      ];

      prismaService.weatherRecord.findMany.mockResolvedValue(records);

      const result = await repository.findManyByCity('são paulo');

      expect(result).toEqual(records);
      expect(prismaService.weatherRecord.findMany).toHaveBeenCalledWith({
        where: {
          city: {
            equals: 'são paulo',
            mode: 'insensitive',
          },
        },
        orderBy: {
          recordedAt: 'desc',
        },
        skip: undefined,
        take: undefined,
      });
    });

    it('should filter by date when since is provided', async () => {
      const since = new Date('2024-01-01');
      prismaService.weatherRecord.findMany.mockResolvedValue([]);

      await repository.findManyByCity('São Paulo', { since });

      expect(prismaService.weatherRecord.findMany).toHaveBeenCalledWith({
        where: {
          city: {
            equals: 'São Paulo',
            mode: 'insensitive',
          },
          recordedAt: {
            gte: since,
          },
        },
        orderBy: {
          recordedAt: 'desc',
        },
        skip: undefined,
        take: undefined,
      });
    });

    it('should support pagination with skip and take', async () => {
      prismaService.weatherRecord.findMany.mockResolvedValue([]);

      await repository.findManyByCity('São Paulo', { skip: 10, take: 5 });

      expect(prismaService.weatherRecord.findMany).toHaveBeenCalledWith({
        where: {
          city: {
            equals: 'São Paulo',
            mode: 'insensitive',
          },
        },
        orderBy: {
          recordedAt: 'desc',
        },
        skip: 10,
        take: 5,
      });
    });
  });

  describe('countByCity', () => {
    it('should count records by city', async () => {
      prismaService.weatherRecord.count.mockResolvedValue(42);

      const result = await repository.countByCity('São Paulo');

      expect(result).toBe(42);
      expect(prismaService.weatherRecord.count).toHaveBeenCalledWith({
        where: {
          city: {
            equals: 'São Paulo',
            mode: 'insensitive',
          },
        },
      });
    });
  });
});
