import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { WeatherEntity } from './weather.entity';
import { WeatherRepository } from './weather.repository';

interface WeatherSummary {
  city: string;
  averageTemp: number;
  maxTemp: number;
  minTemp: number;
}

interface OpenWeatherResponse {
  name: string;
  main: {
    temp: number;
  };
  weather: Array<{
    description: string;
  }>;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cacheTTLSeconds = 600; // 10 minutes
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly weatherRepository: WeatherRepository,
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'OPENWEATHER_BASE_URL',
      'https://api.openweathermap.org/data/2.5',
    );
  }

  async getCurrentWeather(city: string): Promise<WeatherEntity> {
    const normalizedCity = this.normalizeCity(city);
    const cacheKey = this.buildCacheKey(normalizedCity);

    const cached = await this.redisCacheService.get<WeatherEntity>(cacheKey);
    if (cached) {
      return this.toEntity(cached);
    }

    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('OpenWeather API key is not configured');
    }

    let apiResponse: OpenWeatherResponse;

    try {
      const response = await firstValueFrom(
        this.httpService.get<OpenWeatherResponse>(`${this.baseUrl}/weather`, {
          params: {
            q: normalizedCity,
            appid: apiKey,
            units: 'metric',
          },
        }),
      );
      apiResponse = response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Failed to fetch weather data: ${axiosError.message}`, axiosError.stack);
      throw new NotFoundException(`Weather data not found for city ${normalizedCity}`);
    }

    const condition = apiResponse.weather?.[0]?.description ?? 'unknown';
    const temperature = apiResponse.main?.temp;

    if (typeof temperature !== 'number') {
      throw new InternalServerErrorException('Invalid temperature data received from OpenWeatherMap');
    }

    const record = await this.weatherRepository.create({
      city: apiResponse.name || normalizedCity,
      condition,
      temperature,
      recordedAt: new Date(),
    });

    const entity = this.toEntity(record);
    await this.redisCacheService.set(cacheKey, entity, this.cacheTTLSeconds);
    return entity;
  }

  async getWeeklySummary(city: string): Promise<WeatherSummary> {
    const normalizedCity = this.normalizeCity(city);
    const since = this.pastDate(7);

    const records = await this.weatherRepository.findManyByCity(normalizedCity, {
      since,
    });

    if (!records.length) {
      throw new NotFoundException(
        `No weather history available for ${normalizedCity} in the last 7 days`,
      );
    }

    const temperatures = records.map((record) => record.temperature);
    const averageTemp =
      temperatures.reduce((sum, current) => sum + current, 0) / temperatures.length;

    return {
      city: records[0]?.city ?? normalizedCity,
      averageTemp: Number(averageTemp.toFixed(2)),
      maxTemp: Math.max(...temperatures),
      minTemp: Math.min(...temperatures),
    };
  }

  async getHistory(
    city: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: WeatherEntity[]; total: number }> {
    const normalizedCity = this.normalizeCity(city);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.weatherRepository.findManyByCity(normalizedCity, { skip, take: limit }),
      this.weatherRepository.countByCity(normalizedCity),
    ]);

    if (!records.length) {
      throw new NotFoundException(`No weather history available for ${normalizedCity}`);
    }

    return {
      data: records.map((record) => this.toEntity(record)),
      total,
    };
  }

  private buildCacheKey(city: string): string {
    return `weather:current:${city.toLowerCase()}`;
  }

  private normalizeCity(city: string): string {
    return city.trim();
  }

  private pastDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private toEntity(record: WeatherEntity | { [key: string]: unknown }): WeatherEntity {
    const data = {
      ...record,
      recordedAt: record.recordedAt instanceof Date
        ? record.recordedAt
        : new Date(record.recordedAt as string),
    } as Partial<WeatherEntity>;

    return new WeatherEntity(data);
  }
}
