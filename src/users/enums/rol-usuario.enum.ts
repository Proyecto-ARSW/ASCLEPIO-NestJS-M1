import { registerEnumType } from '@nestjs/graphql';

export enum RolUsuario {
  PACIENTE = 'PACIENTE',
  MEDICO = 'MEDICO',
  ADMIN = 'ADMIN',
  RECEPCIONISTA = 'RECEPCIONISTA',
}

registerEnumType(RolUsuario, {
  name: 'RolUsuario',
  description: 'Roles disponibles para un usuario del sistema',
  valuesMap: {
    PACIENTE: { description: 'Paciente (rol por defecto)' },
    MEDICO: { description: 'Médico registrado' },
    ADMIN: { description: 'Administrador del sistema' },
    RECEPCIONISTA: { description: 'Recepcionista' },
  },
});
