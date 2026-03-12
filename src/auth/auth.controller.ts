import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectHospitalDto } from './dto/select-hospital.dto';
import { JoinHospitalDto } from './dto/join-hospital.dto';
import {
  RegisterDocs,
  LoginDocs,
  SelectHospitalDocs,
  JoinHospitalDocs,
} from 'src/docs/auth.docs';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RegisterDocs()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @LoginDocs()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('select-hospital')
  @ApiBearerAuth('JWT-preToken')
  @SelectHospitalDocs()
  @UseGuards(JwtAuthGuard)
  selectHospital(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SelectHospitalDto,
  ) {
    return this.authService.selectHospital(user, dto);
  }

  @Post('join-hospital')
  @ApiBearerAuth('JWT-auth')
  @ApiBearerAuth('JWT-preToken')
  @JoinHospitalDocs()
  @UseGuards(JwtAuthGuard)
  joinHospital(
    @CurrentUser() user: JwtPayload,
    @Body() dto: JoinHospitalDto,
  ) {
    return this.authService.joinHospital(user, dto);
  }
}
