import { ObjectType, Field, ID } from '@nestjs/graphql';
import { RolUsuario } from '../enums/rol-usuario.enum';

@ObjectType({ description: 'Usuario del sistema' })
export class User {
  @Field(() => ID, { description: 'Identificador único del usuario (UUID)' })
  id: string;

  @Field({ description: 'Nombre del usuario' })
  nombre: string;

  @Field({ description: 'Apellido del usuario' })
  apellido: string;

  @Field({ description: 'Correo electrónico único' })
  email: string;

  @Field({ nullable: true, description: 'Teléfono de contacto' })
  telefono?: string;

  @Field(() => RolUsuario, { description: 'Rol del usuario en el sistema' })
  rol: RolUsuario;

  @Field({ description: 'Indica si el usuario está activo' })
  activo: boolean;

  @Field({ description: 'Fecha de creación del registro' })
  creadoEn: Date;
}
