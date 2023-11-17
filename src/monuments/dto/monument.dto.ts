import { ApiProperty } from '@nestjs/swagger';

export class MonumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lat: number;

  @ApiProperty()
  long: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  date: number;

  @ApiProperty()
  ville: string;
}
