import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiParam, ApiBadRequestResponse, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { plainToInstance } from 'class-transformer';
import { WeatherRecordDto } from '../common/dto/weather-record.dto';
import { WeatherSummaryDto } from '../common/dto/weather-summary.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CityParamDto } from '../common/validators/city-param.dto';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@Controller('weather')
@UseInterceptors(CacheInterceptor)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get(':city')
  @CacheTTL(300000)
  @ApiOkResponse({ type: WeatherRecordDto })
  @ApiBadRequestResponse({ description: 'Invalid city name format' })
  @ApiParam({ name: 'city', type: String, description: 'City name' })
  async getCurrentWeather(@Param() params: CityParamDto): Promise<WeatherRecordDto> {
    const weather = await this.weatherService.getCurrentWeather(params.city);
    return plainToInstance(WeatherRecordDto, weather);
  }

  @Get('summary/:city')
  @CacheTTL(600000)
  @ApiOkResponse({ type: WeatherSummaryDto })
  @ApiBadRequestResponse({ description: 'Invalid city name format' })
  @ApiParam({ name: 'city', type: String, description: 'City name' })
  async getWeatherSummary(@Param() params: CityParamDto): Promise<WeatherSummaryDto> {
    const summary = await this.weatherService.getWeeklySummary(params.city);
    return plainToInstance(WeatherSummaryDto, summary);
  }

  @Get('history/:city')
  @CacheTTL(600000)
  @ApiOkResponse({ type: PaginatedResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid city name format' })
  @ApiParam({ name: 'city', type: String, description: 'City name' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWeatherHistory(
    @Param() params: CityParamDto,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<WeatherRecordDto>> {
    const { data, total } = await this.weatherService.getHistory(
      params.city,
      pagination.page,
      pagination.limit,
    );
    const records = data.map((record) => plainToInstance(WeatherRecordDto, record));
    return new PaginatedResponseDto(records, total, pagination.page, pagination.limit);
  }
}
