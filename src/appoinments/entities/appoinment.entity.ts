import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { EstadoCita } from './estado-cita.enum';

@ObjectType()
export class Appoinment {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  pacienteId: string;

  @Field(() => ID)
  medicoId: string;

  @Field()
  fechaHora: Date;

  @Field(() => Int)
  duracionMinutos: number;

  @Field(() => EstadoCita)
  estado: EstadoCita;

  @Field({ nullable: true })
  motivo?: string;

  @Field({ nullable: true })
  notasMedico?: string;

  @Field(() => ID, { nullable: true })
  reagendadaDe?: string;

  @Field(() => ID, { nullable: true })
  canceladaPor?: string;

  @Field({ nullable: true })
  motivoCancelacion?: string;

  @Field()
  creadoEn: Date;

  @Field()
  actualizadoEn: Date;
}
