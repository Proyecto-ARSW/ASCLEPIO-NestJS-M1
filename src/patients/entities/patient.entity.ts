import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class Patient {
   @Field(() => ID, { description: 'Identificador único del paciente (UUID)' })
    id: string;
  
    @Field(() => ID, { description: 'ID del usuario asociado al paciente' })
    usuarioId: string;
  
    @Field({ description: 'Nombre del paciente' })
    nombre: string;
  
    @Field({ description: 'Apellido del paciente' })
    apellido: string;

    @Field({ description: 'Tipo de documento del paciente' })
    tipo_de_documento: string;

    @Field({ description: 'Numero de documento del paciente' })
    numero_de_documento: string;
  
    @Field({ description: 'Correo electrónico del paciente' })
    email: string;
  
    @Field({ nullable: true, description: 'Teléfono de contacto' })
    telefono?: string;
  
    @Field(() => Int, { description: 'ID de la especialidad paciente' })
    especialidadId: number;
  
    @Field({ description: 'Indica si el paciente está activo en el sistema' })
    activo: boolean;
  
    @Field({ description: 'Fecha de creación del registro' })
    creadoEn: Date;
}
