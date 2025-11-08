import { ApiProperty } from '@nestjs/swagger';

export class WeatherRecordDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'São Paulo' })
  city!: string;

  @ApiProperty({ example: 27.3 })
  temperature!: number;

  @ApiProperty({ example: 'clear sky' })
  condition!: string;

  @ApiProperty({ example: new Date().toISOString() })
  recordedAt!: Date;
}
