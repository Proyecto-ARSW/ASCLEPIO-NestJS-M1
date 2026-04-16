import { Field, Float, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

@ObjectType()
export class TriagePreliminaryHistory {
  @Field()
  idpaciente!: string;

  @Field(() => [String])
  sintomas!: string[];

  @Field()
  embarazo!: boolean;

  @Field(() => [String])
  antecedentes!: string[];

  @Field(() => [String])
  posiblesCausas!: string[];

  @Field()
  comentario!: string;

  @Field(() => Int)
  nivelPrioridad!: number;

  @Field()
  comentariosIA!: string;

  @Field()
  advertenciaIA!: string;
}

@ObjectType()
export class TriageComment {
  @Field()
  id!: string;

  @Field()
  author!: string;

  @Field()
  comment!: string;

  @Field()
  createdAt!: string;
}

@ObjectType()
export class TriageVitalSigns {
  @Field(() => Float, { nullable: true })
  temperatureC?: number;

  @Field(() => Int, { nullable: true })
  heartRateBpm?: number;

  @Field(() => Int, { nullable: true })
  respiratoryRateBpm?: number;

  @Field(() => Int, { nullable: true })
  systolicBpMmhg?: number;

  @Field(() => Int, { nullable: true })
  diastolicBpMmhg?: number;

  @Field(() => Int, { nullable: true })
  oxygenSaturationPct?: number;

  @Field(() => Float, { nullable: true })
  weightKg?: number;

  @Field(() => Float, { nullable: true })
  heightCm?: number;
}

@ObjectType()
export class TriageProcedure {
  @Field()
  procedureId!: string;

  @Field()
  patientId!: string;

  @Field()
  transcript!: string;

  @Field()
  inputType!: string;

  @Field(() => TriagePreliminaryHistory)
  preliminaryHistory!: TriagePreliminaryHistory;

  @Field(() => Float)
  confidenceScore!: number;

  @Field()
  status!: string;

  @Field(() => TriageVitalSigns, { nullable: true })
  vitalSigns?: TriageVitalSigns;

  @Field(() => [TriageComment], { nullable: true })
  comments?: TriageComment[];

  @Field({ nullable: true })
  createdAt?: string;

  @Field({ nullable: true })
  updatedAt?: string;
}

@InputType()
export class TriageTextInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  textInput!: string;
}

@InputType()
export class TriageAudioInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  audioBase64!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

@InputType()
export class TriageVitalSignsInput {
  @Field(() => Float, { nullable: true })
  temperatureC?: number;

  @Field(() => Int, { nullable: true })
  heartRateBpm?: number;

  @Field(() => Int, { nullable: true })
  respiratoryRateBpm?: number;

  @Field(() => Int, { nullable: true })
  systolicBpMmhg?: number;

  @Field(() => Int, { nullable: true })
  diastolicBpMmhg?: number;

  @Field(() => Int, { nullable: true })
  oxygenSaturationPct?: number;

  @Field(() => Float, { nullable: true })
  weightKg?: number;

  @Field(() => Float, { nullable: true })
  heightCm?: number;
}

@InputType()
export class TriageCommentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment!: string;
}
