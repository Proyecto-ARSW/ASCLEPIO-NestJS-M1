import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsPositive,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateHospitalDto {
  @ApiProperty({ example: 'Hospital Santa Fe de Bogotá', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({ example: '900.123.456-1', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nit?: string;

  @ApiProperty({ example: 'Cundinamarca', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  departamento: string;

  @ApiProperty({ example: 'Bogotá D.C.', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ciudad: string;

  @ApiProperty({ example: 'Calle 119 # 7-75', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  direccion: string;

  @ApiPropertyOptional({ example: '6015956767', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: 'contacto@santafe.com.co', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  emailContacto?: string;

  @ApiPropertyOptional({ example: 'PRIVADA', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoInstitucion?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacidadUrgencias?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  numeroConsultorios?: number;

  @ApiPropertyOptional({ example: 4.6609, description: 'Latitud geográfica' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({
    example: -74.0577,
    description: 'Longitud geográfica',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
