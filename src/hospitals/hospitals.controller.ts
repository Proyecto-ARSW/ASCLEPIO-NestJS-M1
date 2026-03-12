import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';
import {
  CreateHospitalDocs,
  FindAllHospitalsDocs,
  FindOneHospitalDocs,
  UpdateHospitalDocs,
  ToggleActivoDocs,
  RemoveHospitalDocs,
} from 'src/docs/hospitals.docs';

@ApiTags('Hospitales')
@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @Auth(RolUsuario.ADMIN)
  @CreateHospitalDocs()
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(dto);
  }

  @Get()
  @FindAllHospitalsDocs()
  findAll(@Query('soloActivos') soloActivos?: string) {
    return this.hospitalsService.findAll(soloActivos === 'true');
  }

  @Get(':id')
  @FindOneHospitalDocs()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @Auth(RolUsuario.ADMIN)
  @UpdateHospitalDocs()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.hospitalsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @ApiBearerAuth('JWT-auth')
  @Auth(RolUsuario.ADMIN)
  @ToggleActivoDocs()
  toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalsService.toggleActivo(id);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @Auth(RolUsuario.ADMIN)
  @RemoveHospitalDocs()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalsService.remove(id);
  }
}
