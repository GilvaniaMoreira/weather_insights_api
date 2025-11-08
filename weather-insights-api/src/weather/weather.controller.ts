import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { WeatherRecordDto } from '../common/dto/weather-record.dto';
import { WeatherSummaryDto } from '../common/dto/weather-summary.dto';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get(':city')
  @ApiOkResponse({ type: WeatherRecordDto })
  async getCurrentWeather(@Param('city') city: string): Promise<WeatherRecordDto> {
    const weather = await this.weatherService.getCurrentWeather(city);
    return plainToInstance(WeatherRecordDto, weather);
  }

  @Get('summary/:city')
  @ApiOkResponse({ type: WeatherSummaryDto })
  async getWeatherSummary(@Param('city') city: string): Promise<WeatherSummaryDto> {
    const summary = await this.weatherService.getWeeklySummary(city);
    return plainToInstance(WeatherSummaryDto, summary);
  }

  @Get('history/:city')
  @ApiOkResponse({ type: WeatherRecordDto, isArray: true })
  async getWeatherHistory(@Param('city') city: string): Promise<WeatherRecordDto[]> {
    const history = await this.weatherService.getHistory(city);
    return history.map((record) => plainToInstance(WeatherRecordDto, record));
  }
}
