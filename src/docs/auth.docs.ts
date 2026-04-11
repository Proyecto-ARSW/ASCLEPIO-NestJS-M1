/**
 * @file auth.docs.ts
 * Documentación Swagger para el módulo de Autenticación.
 * Cada función retorna un conjunto de decoradores aplicables con applyDecorators().
 * Se inyectan en el controlador para mantener el código fuente limpio.
 */
import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { SelectHospitalDto } from 'src/auth/dto/select-hospital.dto';
import { JoinHospitalDto } from 'src/auth/dto/join-hospital.dto';
import {
  AuthResponseDto,
  LoginResponseDto,
} from 'src/auth/dto/auth-response.dto';

export const RegisterDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Registrar nuevo usuario',
      description: `
Crea un nuevo usuario en el sistema y lo vincula al hospital indicado.

**Reglas de creación por rol:**
- \`PACIENTE\`: Se crea el registro en la tabla \`pacientes\`. Los datos de \`pacienteData\` son opcionales.
- \`MEDICO\`: **Requiere** \`medicoData\` (especialidadId, numeroRegistro). Se crea el registro en \`medicos\`.
- \`ENFERMERO\`: **Requiere** \`enfermeroData\` (numeroRegistro, nivelFormacion, areaEspecializacion). Se crea en \`enfermeros\`.
- \`ADMIN\` / \`RECEPCIONISTA\`: Solo se crea el usuario base. No tienen tabla propia.

El \`hospitalId\` es siempre **requerido** para vincular el usuario al hospital desde el inicio.

**Retorna** un \`accessToken\` JWT completo listo para usar.
      `.trim(),
    }),
    ApiBody({ type: RegisterDto }),
    ApiResponse({
      status: 201,
      description:
        'Usuario creado exitosamente. Retorna JWT con hospital seleccionado.',
      type: AuthResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Datos incompletos: medicoData o enfermeroData faltantes según el rol, o validaciones fallidas.',
    }),
    ApiConflictResponse({
      description:
        'El email, número de registro médico o de enfermero ya existe.',
    }),
    ApiNotFoundResponse({
      description: 'El hospitalId no corresponde a un hospital activo.',
    }),
  );

export const LoginDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Iniciar sesión',
      description: `
Valida las credenciales del usuario y retorna:
- \`preToken\`: JWT temporal de **5 minutos** para seleccionar hospital (no tiene hospitalId).
- \`hospitales\`: Lista de hospitales a los que el usuario pertenece.
- \`usuario\`: Datos básicos del usuario autenticado.

**Flujo obligatorio:** Usar el \`preToken\` en \`POST /auth/select-hospital\` para obtener el JWT de sesión completo.
      `.trim(),
    }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      status: 200,
      description:
        'Credenciales válidas. Retorna preToken y lista de hospitales.',
      type: LoginResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Email o contraseña incorrectos, o usuario inactivo.',
    }),
  );

export const SelectHospitalDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Seleccionar hospital de sesión',
      description: `
Segundo paso del flujo de login. Requiere el \`preToken\` obtenido en \`POST /auth/login\`
como Bearer token.

Valida que el usuario esté vinculado al hospital indicado y emite un **JWT de sesión completo**
que incluye \`hospitalId\` y \`hospitalNombre\`. Este token debe usarse para todas las
operaciones protegidas del sistema.

**El preToken expira en 5 minutos.** Si expira, hacer login nuevamente.
      `.trim(),
    }),
    ApiBody({ type: SelectHospitalDto }),
    ApiResponse({
      status: 201,
      description:
        'JWT de sesión completo emitido con el hospital seleccionado.',
      type: AuthResponseDto,
    }),
    ApiUnauthorizedResponse({ description: 'preToken inválido o expirado.' }),
    ApiNotFoundResponse({
      description: 'El hospital no existe o está inactivo.',
    }),
    ApiResponse({
      status: 403,
      description:
        'El usuario no está inscrito en este hospital. Usar /auth/join-hospital primero.',
    }),
  );

export const JoinHospitalDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Inscribirse a un hospital adicional',
      description: `
Permite a un usuario autenticado inscribirse en un hospital distinto al actual.
Requiere JWT de sesión completo (con hospitalId).

Tras la inscripción, el usuario debe hacer **logout y login nuevamente** para
seleccionar el nuevo hospital en \`POST /auth/select-hospital\`.
      `.trim(),
    }),
    ApiBody({ type: JoinHospitalDto }),
    ApiResponse({
      status: 201,
      description:
        'Inscripción exitosa. Hacer login para acceder al nuevo hospital.',
      schema: {
        properties: {
          mensaje: {
            type: 'string',
            example: 'Inscripción exitosa en "Hospital X".',
          },
          hospital: {
            properties: {
              id: { type: 'number' },
              nombre: { type: 'string' },
              departamento: { type: 'string' },
              ciudad: { type: 'string' },
            },
          },
        },
      },
    }),
    ApiConflictResponse({ description: 'Ya estás inscrito en este hospital.' }),
    ApiNotFoundResponse({ description: 'Hospital no encontrado o inactivo.' }),
    ApiUnauthorizedResponse({ description: 'JWT inválido o expirado.' }),
  );
