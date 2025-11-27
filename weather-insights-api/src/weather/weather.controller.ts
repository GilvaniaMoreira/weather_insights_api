import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiParam, ApiBadRequestResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { WeatherRecordDto } from '../common/dto/weather-record.dto';
import { WeatherSummaryDto } from '../common/dto/weather-summary.dto';
import { CityParamDto } from '../common/validators/city-param.dto';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get(':city')
  @ApiOkResponse({ type: WeatherRecordDto })
  @ApiBadRequestResponse({ description: 'Invalid city name format' })
  @ApiParam({ name: 'city', type: String, description: 'City name' })
  async getCurrentWeather(@Param() params: CityParamDto): Promise<WeatherRecordDto> {
    const weather = await this.weatherService.getCurrentWeather(params.city);
    return plainToInstance(WeatherRecordDto, weather);
  }

  @Get('summary/:city')
  @ApiOkResponse({ type: WeatherSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid city name format' })
  @ApiParam({ name: 'city', type: String, description: 'City name' })
  async getWeatherSummary(@Param() params: CityParamDto): Promise<WeatherSummaryDto> {
    const summary = await this.weatherService.getWeeklySummary(params.city);
    return plainToInstance(WeatherSummaryDto, summary);
  }

  @Get('history/:city')
  @ApiOkResponse({ type: WeatherRecordDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid city name format' })
  @ApiParam({ name: 'city', type: String, description: 'City name' })
  async getWeatherHistory(@Param() params: CityParamDto): Promise<WeatherRecordDto[]> {
    const history = await this.weatherService.getHistory(params.city);
    return history.map((record) => plainToInstance(WeatherRecordDto, record));
  }
}
