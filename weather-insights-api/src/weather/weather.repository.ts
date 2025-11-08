import { Injectable } from '@nestjs/common';
import { WeatherRecord, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateWeatherRecordInput {
  city: string;
  temperature: number;
  condition: string;
  recordedAt: Date;
}

@Injectable()
export class WeatherRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWeatherRecordInput): Promise<WeatherRecord> {
    return this.prisma.weatherRecord.create({
      data,
    });
  }

  findManyByCity(city: string, args: { since?: Date } = {}): Promise<WeatherRecord[]> {
    const where: Prisma.WeatherRecordWhereInput = {
      city: {
        equals: city,
        mode: 'insensitive',
      },
    };

    if (args.since) {
      where.recordedAt = {
        gte: args.since,
      };
    }

    return this.prisma.weatherRecord.findMany({
      where,
      orderBy: {
        recordedAt: 'desc',
      },
    });
  }
}
