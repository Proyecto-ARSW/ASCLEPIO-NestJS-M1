import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsOptional, IsString } from 'class-validator';

@InputType()
export class CancelAppoinmentInput {
  @IsUUID()
  @Field(() => ID)
  id: string;

  /** ID del usuario (médico, recepcionista o admin) que cancela */
  @IsUUID()
  @Field(() => ID)
  canceladaPor: string;

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  motivoCancelacion?: string;
}
