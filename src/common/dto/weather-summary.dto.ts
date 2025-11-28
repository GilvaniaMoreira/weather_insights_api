import { ApiProperty } from '@nestjs/swagger';

export class WeatherSummaryDto {
  @ApiProperty({ example: 'São Paulo' })
  city!: string;

  @ApiProperty({ example: 27.3 })
  averageTemp!: number;

  @ApiProperty({ example: 31.2 })
  maxTemp!: number;

  @ApiProperty({ example: 22.1 })
  minTemp!: number;
}
