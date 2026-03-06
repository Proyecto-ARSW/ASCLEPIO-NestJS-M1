import { InputType, Field, Int } from '@nestjs/graphql';

@InputType({
  description: 'Datos para registrar un médico junto con su usuario',
})
export class RegisterDoctorInput {
  // --- Datos del usuario ---
  @Field({ description: 'Nombre del médico' })
  nombre: string;

  @Field({ description: 'Apellido del médico' })
  apellido: string;

  @Field({ description: 'Correo electrónico (único)' })
  email: string;

  @Field({ description: 'Contraseña del usuario' })
  password: string;

  @Field({ nullable: true, description: 'Teléfono de contacto (opcional)' })
  telefono?: string;

  // --- Datos del médico ---
  @Field(() => Int, { description: 'ID de la especialidad médica' })
  especialidadId: number;

  @Field({
    description: 'Número de registro médico único (máx. 50 caracteres)',
  })
  numeroRegistro: string;

  @Field({
    nullable: true,
    description:
      'Número o nombre del consultorio (opcional, máx. 20 caracteres)',
  })
  consultorio?: string;
}
