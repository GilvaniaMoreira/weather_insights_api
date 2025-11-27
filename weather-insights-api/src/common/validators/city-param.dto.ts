import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CityParamDto {
  @ApiProperty({ 
    example: 'London',
    description: 'City name (letters, spaces and hyphens only)',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-ZÀ-ÿ\s-]+$/, {
    message: 'City name must contain only letters, spaces and hyphens',
  })
  city: string;
}
