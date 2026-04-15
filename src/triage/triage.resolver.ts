import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { RolUsuario } from 'src/users/enums/rol-usuario.enum';
import { TriageService } from './triage.service';
import {
  TriageAudioInput,
  TriageCommentInput,
  TriageProcedure,
  TriagePreliminaryHistory,
  TriageTextInput,
  TriageVitalSignsInput,
} from './triage.types';

@Resolver(() => TriageProcedure)
export class TriageResolver {
  constructor(private readonly triageService: TriageService) {}

  @Auth(RolUsuario.PACIENTE)
  @Mutation(() => TriageProcedure, {
    description:
      'Registra sintomas por texto usando el id de paciente del JWT autenticado.',
  })
  triageCreateFromText(
    @Args('input') input: TriageTextInput,
    @Context('req') req: { headers?: { authorization?: string } },
  ): Promise<TriageProcedure> {
    return this.triageService.createFromText(
      input.textInput,
      req?.headers?.authorization,
    );
  }

  @Auth(RolUsuario.PACIENTE)
  @Mutation(() => TriageProcedure, {
    description:
      'Registra sintomas por audio (base64) usando el id de paciente del JWT autenticado.',
  })
  triageCreateFromAudio(
    @Args('input') input: TriageAudioInput,
    @Context('req') req: { headers?: { authorization?: string } },
  ): Promise<TriageProcedure> {
    return this.triageService.createFromAudio(
      input,
      req?.headers?.authorization,
    );
  }

  @Auth(RolUsuario.PACIENTE)
  @Query(() => [TriageProcedure], {
    description:
      'Obtiene los procedimientos de triage del paciente autenticado.',
  })
  triageMyProcedures(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
    @Context('req') req: { headers?: { authorization?: string } },
  ): Promise<TriageProcedure[]> {
    return this.triageService.getMyProcedures(
      limit,
      req?.headers?.authorization,
    );
  }

  @Auth(RolUsuario.PACIENTE, RolUsuario.ENFERMERO, RolUsuario.MEDICO)
  @Query(() => TriagePreliminaryHistory, {
    description:
      'Obtiene la historia clinica preliminar en formato JSON estructurado.',
  })
  triagePreliminaryHistory(
    @Args('procedureId') procedureId: string,
    @Context('req') req: { headers?: { authorization?: string } },
  ): Promise<TriagePreliminaryHistory> {
    return this.triageService.getPreliminaryHistory(
      procedureId,
      req?.headers?.authorization,
    );
  }

  @Auth(RolUsuario.PACIENTE, RolUsuario.ENFERMERO, RolUsuario.MEDICO)
  @Query(() => TriageProcedure, {
    description:
      'Obtiene el procedimiento completo de triage para visualizacion clinica.',
  })
  triageProcedure(
    @Args('procedureId') procedureId: string,
    @Context('req') req: { headers?: { authorization?: string } },
  ): Promise<TriageProcedure> {
    return this.triageService.getProcedure(
      procedureId,
      req?.headers?.authorization,
    );
  }

  @Auth(RolUsuario.ENFERMERO, RolUsuario.MEDICO)
  @Mutation(() => TriageProcedure, {
    description:
      'Actualiza signos vitales del procedimiento (solo enfermero o medico).',
  })
  triageUpdateVitalSigns(
    @Args('procedureId') procedureId: string,
    @Args('input') input: TriageVitalSignsInput,
    @Context('req') req: { headers?: { authorization?: string } },
  ): Promise<TriageProcedure> {
    return this.triageService.updateVitalSigns(
      procedureId,
      input,
      req?.headers?.authorization,
    );
  }

  @Auth(RolUsuario.ENFERMERO, RolUsuario.MEDICO)
  @Mutation(() => TriageProcedure, {
    description: 'Agrega comentario medico al procedimiento.',
  })
  triageAddComment(
    @Args('procedureId') procedureId: string,
    @Args('input') input: TriageCommentInput,
    @Context('req') req: { headers?: { authorization?: string } },
  ): Promise<TriageProcedure> {
    return this.triageService.addComment(
      procedureId,
      input.comment,
      req?.headers?.authorization,
    );
  }
}
