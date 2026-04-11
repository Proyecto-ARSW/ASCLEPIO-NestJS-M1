import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SelectHospitalDto {
  @ApiProperty({
    example: 1,
    description:
      'ID del hospital al cual el usuario desea acceder en esta sesión',
  })
  @IsInt()
  @Min(1)
  hospitalId: number;
}
