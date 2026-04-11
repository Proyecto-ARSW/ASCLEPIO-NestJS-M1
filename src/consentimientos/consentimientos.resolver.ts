import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { ConsentimientosService } from './consentimientos.service';
import { ConsentimientoPaciente } from './entities/consentimiento-paciente.entity';
import { CreateConsentimientoInput } from './dto/create-consentimiento.input';
import { UpdateConsentimientoInput } from './dto/update-consentimiento.input';
import { Auth } from '../auth/decorators/auth.decorator';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

/**
 * Flujo de consentimientos de paciente:
 *  1. MEDICO o RECEPCIONISTA registran el consentimiento al inicio de un procedimiento.
 *     Se captura si el paciente otorgó (true) o no (false) el consentimiento.
 *  2. El documento firmado (PDF, imagen) se puede adjuntar como URL/ruta.
 *  3. Si el paciente retira el consentimiento, se usa revocarConsentimiento → pone
 *     revocado=true y registra la fecha de revocación.
 *  4. Los consentimientos son inmutables salvo el campo documentoFirmado.
 *  5. ADMIN, MEDICO y RECEPCIONISTA pueden consultar consentimientos.
 */
@Resolver(() => ConsentimientoPaciente)
export class ConsentimientosResolver {
  constructor(
    private readonly consentimientosService: ConsentimientosService,
  ) {}

  @Auth(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.RECEPCIONISTA)
  @Mutation(() => ConsentimientoPaciente, {
    description:
      'Registra un consentimiento informado de un paciente (ADMIN/MEDICO/RECEPCIONISTA)',
  })
  createConsentimiento(
    @Args('input') input: CreateConsentimientoInput,
  ): Promise<ConsentimientoPaciente> {
    return this.consentimientosService.create(input);
  }

  @Auth(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.RECEPCIONISTA)
  @Query(() => [ConsentimientoPaciente], {
    name: 'consentimientosByPaciente',
    description: 'Lista todos los consentimientos de un paciente',
  })
  findByPaciente(
    @Args('pacienteId', { type: () => ID }) pacienteId: string,
  ): Promise<ConsentimientoPaciente[]> {
    return this.consentimientosService.findByPaciente(pacienteId);
  }

  @Auth(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.RECEPCIONISTA)
  @Query(() => ConsentimientoPaciente, {
    name: 'consentimiento',
    description: 'Busca un consentimiento por ID',
  })
  findOne(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<ConsentimientoPaciente> {
    return this.consentimientosService.findOne(id);
  }

  @Auth(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
  @Mutation(() => ConsentimientoPaciente, {
    description:
      'Actualiza el documento firmado de un consentimiento (ADMIN/RECEPCIONISTA)',
  })
  updateConsentimiento(
    @Args('input') input: UpdateConsentimientoInput,
  ): Promise<ConsentimientoPaciente> {
    return this.consentimientosService.update(input.id, input);
  }

  @Auth(RolUsuario.ADMIN, RolUsuario.MEDICO, RolUsuario.RECEPCIONISTA)
  @Mutation(() => ConsentimientoPaciente, {
    description:
      'Revoca un consentimiento de paciente (registra fecha de revocación)',
  })
  revocarConsentimiento(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<ConsentimientoPaciente> {
    return this.consentimientosService.revocar(id);
  }
}
