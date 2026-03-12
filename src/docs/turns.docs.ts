/**
 * @file turns.docs.ts
 * Documentación de referencia para el módulo de Turnos.
 * Los turnos son gestionados por GraphQL — esta documentación es informativa
 * para que aparezca en Swagger como referencia de los tipos y flujos.
 */

export const TURN_GRAPHQL_REFERENCE = `
## Sistema de Turnos (GraphQL)

El sistema de turnos es en tiempo real vía GraphQL con WebSocket subscriptions.

### Mutations disponibles
- \`crearTurno(input: CreateTurnInput): Turno\` — Registrar turno en cola
- \`llamarSiguienteTurno(medicoId?): Turno\` — Llamar siguiente (por prioridad: URGENTE > PRIORITARIO > NORMAL)
- \`atenderTurno(id): Turno\` — Marcar como atendido
- \`cancelarTurno(id): Turno\` — Cancelar turno

### Queries disponibles
- \`turnosPorHospital(fecha?, estado?): [Turno]\` — Cola del hospital del usuario
- \`turnosPorPaciente(pacienteId, fecha?): [Turno]\` — Historial de turnos de un paciente
- \`turno(id): Turno\` — Turno específico
- \`turnosEnEspera(medicoId?): Int\` — Cantidad en cola

### Subscriptions en tiempo real
- \`turnoActualizado(hospitalId): TurnoEvento\` — Canal del hospital (sala de espera)
- \`miTurnoActualizado(pacienteId): TurnoEvento\` — Canal personal del paciente
`;
