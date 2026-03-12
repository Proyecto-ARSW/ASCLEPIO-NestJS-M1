import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class JoinHospitalDto {
  @ApiProperty({
    example: 2,
    description: 'ID del hospital al que el usuario desea inscribirse',
  })
  @IsInt()
  @Min(1)
  hospitalId: number;
}
