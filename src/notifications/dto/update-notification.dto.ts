import { IsInt } from 'class-validator';

// Este archivo se mantiene por compatibilidad con el gateway existente.
// La lógica de actualización se maneja directamente en el resolver GraphQL.
export class UpdateNotificationDto {
  @IsInt()
  id: number;
}
