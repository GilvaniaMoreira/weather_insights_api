export class WeatherEntity {
  id!: number;
  city!: string;
  temperature!: number;
  condition!: string;
  recordedAt!: Date;

  constructor(partial: Partial<WeatherEntity>) {
    Object.assign(this, partial);
  }
}
