import { PubSub } from 'graphql-subscriptions';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { EstadoTurno, TipoTurno } from '../src/turn/entities/turn.entity';

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => Promise<void> | void) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  not: { toBe: (expected: unknown) => void };
};
declare const jest: {
  fn: <T extends (...args: never[]) => unknown>(impl?: T) => T;
  mock: (moduleName: string, factory: () => unknown, options?: { virtual?: boolean }) => void;
};

jest.mock(
  'generated/prisma/client',
  () => {
    class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: { target?: unknown };

      constructor(message: string, code: string, meta?: { target?: unknown }) {
        super(message);
        this.code = code;
        this.meta = meta;
      }
    }

    return {
      PrismaClient: class PrismaClient {},
      Prisma: {
        PrismaClientKnownRequestError,
        join: (values: unknown[]) => values,
        sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
      },
    };
  },
  { virtual: true },
);

type TurnRecord = {
  id: string;
  paciente_id: string;
  medico_id: string | null;
  especialidad_id: number | null;
  hospital_id: number | null;
  numero_turno: number;
  tipo: TipoTurno;
  estado: EstadoTurno;
  posicion_cola: number | null;
  llamado_en: Date | null;
  atendido_en: Date | null;
  fecha: Date;
  creado_en: Date;
};

type HospitalRecord = { id: number; nombre: string; activo: boolean };
type PacienteRecord = { id: string; usuario_id: string };
type NotificacionRecord = {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  referencia_id?: string;
  leida: boolean;
  creado_en: Date;
};

function truncateDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDate(a: Date, b: Date): boolean {
  return truncateDate(a).getTime() === truncateDate(b).getTime();
}

function createTurnPrismaMock() {
  const hospitals = new Map<number, HospitalRecord>([
    [1, { id: 1, nombre: 'Hospital Central', activo: true }],
    [2, { id: 2, nombre: 'Hospital Norte', activo: true }],
  ]);

  const patients = new Map<string, PacienteRecord>();
  for (let i = 1; i <= 20; i++) {
    patients.set(`pac-${i}`, { id: `pac-${i}`, usuario_id: `usr-${i}` });
  }

  let turnCounter = 1;
  let notificationCounter = 1;
  const turns: TurnRecord[] = [];
  const notifications: NotificacionRecord[] = [];

  let txQueue = Promise.resolve();

  const matchesWhere = (turn: TurnRecord, where: Record<string, unknown> | undefined) => {
    if (!where) return true;

    if (where.id && turn.id !== where.id) return false;
    if (where.paciente_id && turn.paciente_id !== where.paciente_id) return false;

    if (Object.prototype.hasOwnProperty.call(where, 'hospital_id')) {
      if (turn.hospital_id !== (where.hospital_id as number | null | undefined)) return false;
    }

    if (Object.prototype.hasOwnProperty.call(where, 'medico_id')) {
      if (turn.medico_id !== (where.medico_id as string | null | undefined)) return false;
    }

    if (where.fecha && !sameDate(turn.fecha, where.fecha as Date)) return false;

    if (where.estado) {
      const estadoFilter = where.estado as string | { in?: string[] };
      if (typeof estadoFilter === 'string') {
        if (turn.estado !== estadoFilter) return false;
      } else if (estadoFilter.in && !estadoFilter.in.includes(turn.estado)) {
        return false;
      }
    }

    return true;
  };

  const orderTurns = (input: TurnRecord[], orderBy: unknown) => {
    if (!orderBy) return [...input];
    const list = [...input];
    const orderArray = Array.isArray(orderBy) ? orderBy : [orderBy];

    list.sort((a, b) => {
      for (const rule of orderArray) {
        const key = Object.keys(rule as Record<string, unknown>)[0] as keyof TurnRecord;
        const direction = (rule as Record<string, 'asc' | 'desc'>)[key as string];
        const left = a[key] as string | number;
        const right = b[key] as string | number;

        if (left === right) continue;
        if (direction === 'desc') {
          return left < right ? 1 : -1;
        }
        return left > right ? 1 : -1;
      }
      return 0;
    });

    return list;
  };

  const withPaciente = <T extends TurnRecord>(turn: T, include: unknown) => {
    if (!(include as { pacientes?: unknown } | undefined)?.pacientes) {
      return turn;
    }

    const patient = patients.get(turn.paciente_id);
    return {
      ...turn,
      pacientes: patient ? { usuario_id: patient.usuario_id } : null,
    };
  };

  const recomputeAllWaitingPositions = () => {
    const groups = new Map<string, TurnRecord[]>();
    for (const turn of turns) {
      if (turn.estado !== EstadoTurno.EN_ESPERA || turn.hospital_id == null) continue;
      const key = `${turn.hospital_id}:${truncateDate(turn.fecha).toISOString().slice(0, 10)}`;
      const existing = groups.get(key) ?? [];
      existing.push(turn);
      groups.set(key, existing);
    }

    for (const group of groups.values()) {
      group
        .sort((a, b) => {
          if (a.tipo !== b.tipo) return a.tipo < b.tipo ? 1 : -1;
          return a.numero_turno - b.numero_turno;
        })
        .forEach((turn, idx) => {
          turn.posicion_cola = idx + 1;
        });
    }
  };

  const prisma = {
    hospitales: {
      findUnique: async ({ where }: { where: { id: number } }) => hospitals.get(where.id) ?? null,
    },
    pacientes: {
      findUnique: async ({ where }: { where: { id: string } }) => patients.get(where.id) ?? null,
    },
    medicos: {
      findUnique: async () => null,
    },
    especialidades: {
      findUnique: async () => null,
    },
    turnos: {
      findFirst: async ({ where, orderBy, include, select }: Record<string, unknown>) => {
        const ordered = orderTurns(
          turns.filter((turn) => matchesWhere(turn, where as Record<string, unknown> | undefined)),
          orderBy,
        );
        const found = ordered[0];
        if (!found) return null;
        if (select && (select as { numero_turno?: boolean }).numero_turno) {
          return { numero_turno: found.numero_turno };
        }
        return withPaciente(found, include);
      },
      findMany: async ({ where, orderBy, select }: Record<string, unknown>) => {
        const ordered = orderTurns(
          turns.filter((turn) => matchesWhere(turn, where as Record<string, unknown> | undefined)),
          orderBy,
        );
        if (select && (select as { id?: boolean }).id) {
          return ordered.map((turn) => ({ id: turn.id }));
        }
        return ordered;
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        turns.filter((turn) => matchesWhere(turn, where)).length,
      create: async ({ data }: { data: Partial<TurnRecord> }) => {
        const fecha = truncateDate((data.fecha as Date | undefined) ?? new Date());
        const duplicate = turns.find(
          (turn) =>
            turn.hospital_id === (data.hospital_id ?? null) &&
            sameDate(turn.fecha, fecha) &&
            turn.numero_turno === data.numero_turno,
        );
        if (duplicate) {
          throw new Error(
            'duplicate key value violates unique constraint "idx_turnos_unique_hospital_fecha_numero"',
          );
        }

        const created: TurnRecord = {
          id: `turn-${turnCounter++}`,
          paciente_id: String(data.paciente_id),
          medico_id: (data.medico_id as string | null | undefined) ?? null,
          especialidad_id: (data.especialidad_id as number | null | undefined) ?? null,
          hospital_id: (data.hospital_id as number | null | undefined) ?? null,
          numero_turno: Number(data.numero_turno),
          tipo: (data.tipo as TipoTurno | undefined) ?? TipoTurno.NORMAL,
          estado: (data.estado as EstadoTurno | undefined) ?? EstadoTurno.EN_ESPERA,
          posicion_cola: (data.posicion_cola as number | null | undefined) ?? null,
          llamado_en: null,
          atendido_en: null,
          fecha,
          creado_en: new Date(),
        };

        turns.push(created);
        return created;
      },
      findUnique: async ({ where, include }: Record<string, unknown>) => {
        const found = turns.find((turn) => turn.id === (where as { id: string }).id);
        return found ? withPaciente(found, include) : null;
      },
      update: async ({ where, data, include }: Record<string, unknown>) => {
        const found = turns.find((turn) => turn.id === (where as { id: string }).id);
        if (!found) throw new Error('Turno no encontrado');
        Object.assign(found, data);
        return withPaciente(found, include);
      },
      updateMany: async ({ where, data }: Record<string, unknown>) => {
        let count = 0;
        for (const turn of turns) {
          if (!matchesWhere(turn, where as Record<string, unknown> | undefined)) continue;
          Object.assign(turn, data);
          count += 1;
        }
        return { count };
      },
    },
    notificaciones: {
      create: async ({ data }: { data: Omit<NotificacionRecord, 'id' | 'leida' | 'creado_en'> }) => {
        const notif: NotificacionRecord = {
          id: `notif-${notificationCounter++}`,
          usuario_id: data.usuario_id,
          titulo: data.titulo,
          mensaje: data.mensaje,
          tipo: data.tipo,
          referencia_id: data.referencia_id,
          leida: false,
          creado_en: new Date(),
        };
        notifications.push(notif);
        return notif;
      },
    },
    $executeRaw: async () => {
      recomputeAllWaitingPositions();
      return 1;
    },
    $transaction: async <T>(cb: (tx: typeof prisma) => Promise<T>) => {
      const previous = txQueue;
      let release: () => void = () => {};
      txQueue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await cb(prisma);
      } finally {
        release();
      }
    },
    _state: {
      turns,
      notifications,
    },
  };

  return prisma;
}

describe('Turn flow integration (service)', () => {
  function buildService() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TurnService } = require('../src/turn/turn.service') as {
      TurnService: new (
        prisma: PrismaService,
        notifications: NotificationsService,
        pubSub: PubSub,
      ) => {
        create: (input: { pacienteId: string; hospitalId: number; tipo: TipoTurno }) => Promise<{
          id: string;
          numeroTurno: number;
          estado: EstadoTurno;
        }>;
        cancelar: (id: string) => Promise<unknown>;
        llamarSiguiente: (hospitalId: number, medicoId?: string) => Promise<{
          id: string;
          estado: EstadoTurno;
        }>;
      };
    };

    const prisma = createTurnPrismaMock();
    const notifications = {
      create: jest.fn(async () => ({ id: 'notif-created' })),
    } as unknown as NotificationsService;
    const pubSub = {
      publish: jest.fn(async () => true),
    } as unknown as PubSub;

    const service = new TurnService(
      prisma as unknown as PrismaService,
      notifications,
      pubSub,
    );

    return { service, prisma, notifications, pubSub };
  }

  it('crear -> cancelar -> crear nuevamente en mismo paciente/hospital funciona', async () => {
    const { service, prisma } = buildService();

    const first = await service.create({
      pacienteId: 'pac-1',
      hospitalId: 1,
      tipo: TipoTurno.NORMAL,
    });

    await service.cancelar(first.id);

    const second = await service.create({
      pacienteId: 'pac-1',
      hospitalId: 1,
      tipo: TipoTurno.NORMAL,
    });

    expect(second.id).not.toBe(first.id);
    expect(second.numeroTurno).toBe(first.numeroTurno + 1);

    const firstStored = prisma._state.turns.find((turn) => turn.id === first.id);
    expect(firstStored?.estado).toBe(EstadoTurno.CANCELADO);
  });

  it('llamar siguiente toma turno en espera del hospital indicado', async () => {
    const { service } = buildService();

    const h1Turn = await service.create({
      pacienteId: 'pac-1',
      hospitalId: 1,
      tipo: TipoTurno.NORMAL,
    });
    await service.create({
      pacienteId: 'pac-2',
      hospitalId: 2,
      tipo: TipoTurno.NORMAL,
    });

    const called = await service.llamarSiguiente(1);

    expect(called.id).toBe(h1Turn.id);
    expect(called.estado).toBe(EstadoTurno.EN_CONSULTA);
  });

  it('creacion concurrente basica evita numeros duplicados', async () => {
    const { service } = buildService();

    const created = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        service.create({
          pacienteId: `pac-${idx + 1}`,
          hospitalId: 1,
          tipo: TipoTurno.NORMAL,
        }),
      ),
    );

    const numbers = created.map((turn) => turn.numeroTurno);
    const uniqueNumbers = new Set(numbers);

    expect(uniqueNumbers.size).toBe(created.length);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(10);
  });
});
