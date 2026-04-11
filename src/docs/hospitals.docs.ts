/**
 * @file hospitals.docs.ts
 * Documentación Swagger para el módulo de Hospitales.
 */
import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

export const CreateHospitalDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Crear hospital',
      description:
        'Crea un nuevo hospital en el sistema. **Requiere rol ADMIN.**',
    }),
    ApiResponse({ status: 201, description: 'Hospital creado exitosamente.' }),
    ApiBadRequestResponse({ description: 'Datos inválidos o faltantes.' }),
    ApiConflictResponse({ description: 'Ya existe un hospital con ese NIT.' }),
    ApiUnauthorizedResponse({ description: 'JWT inválido o expirado.' }),
    ApiForbiddenResponse({
      description: 'Solo administradores pueden crear hospitales.',
    }),
  );

export const FindAllHospitalsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Listar hospitales',
      description:
        'Retorna todos los hospitales. Sin autenticación. Usar `soloActivos=true` para filtrar.',
    }),
    ApiQuery({
      name: 'soloActivos',
      required: false,
      type: Boolean,
      description: 'Si es true, retorna solo hospitales con activo=true',
    }),
    ApiResponse({ status: 200, description: 'Lista de hospitales.' }),
  );

export const FindOneHospitalDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Obtener hospital por ID' }),
    ApiParam({ name: 'id', type: Number, description: 'ID del hospital' }),
    ApiResponse({ status: 200, description: 'Hospital encontrado.' }),
    ApiNotFoundResponse({ description: 'Hospital no encontrado.' }),
  );

export const UpdateHospitalDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Actualizar hospital',
      description: 'Actualiza campos del hospital. **Requiere rol ADMIN.**',
    }),
    ApiParam({ name: 'id', type: Number, description: 'ID del hospital' }),
    ApiResponse({ status: 200, description: 'Hospital actualizado.' }),
    ApiNotFoundResponse({ description: 'Hospital no encontrado.' }),
    ApiConflictResponse({ description: 'El NIT ya está en uso.' }),
    ApiUnauthorizedResponse({ description: 'JWT inválido o expirado.' }),
    ApiForbiddenResponse({ description: 'Solo administradores.' }),
  );

export const ToggleActivoDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Activar / desactivar hospital',
      description:
        'Alterna el estado `activo` del hospital. **Requiere rol ADMIN.**',
    }),
    ApiParam({ name: 'id', type: Number, description: 'ID del hospital' }),
    ApiResponse({
      status: 200,
      description: 'Estado alternado correctamente.',
    }),
    ApiNotFoundResponse({ description: 'Hospital no encontrado.' }),
    ApiUnauthorizedResponse({ description: 'JWT inválido o expirado.' }),
    ApiForbiddenResponse({ description: 'Solo administradores.' }),
  );

export const RemoveHospitalDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Eliminar hospital',
      description:
        'Elimina permanentemente un hospital. **Requiere rol ADMIN.** Usar con precaución; prefiera desactivar con PATCH /:id/toggle.',
    }),
    ApiParam({ name: 'id', type: Number, description: 'ID del hospital' }),
    ApiResponse({ status: 200, description: 'Hospital eliminado.' }),
    ApiNotFoundResponse({ description: 'Hospital no encontrado.' }),
    ApiUnauthorizedResponse({ description: 'JWT inválido o expirado.' }),
    ApiForbiddenResponse({ description: 'Solo administradores.' }),
  );
