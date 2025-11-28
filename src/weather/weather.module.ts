import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RedisCacheService } from '../common/utils/redis-cache.service';
import { WeatherController } from './weather.controller';
import { WeatherRepository } from './weather.repository';
import { WeatherService } from './weather.service';

@Module({
  imports: [HttpModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherRepository, RedisCacheService],
  exports: [WeatherService],
})
export class WeatherModule {}
