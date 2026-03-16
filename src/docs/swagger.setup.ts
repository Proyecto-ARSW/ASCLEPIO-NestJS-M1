/**
 * @file swagger.setup.ts
 * Configuración y setup completo de Swagger/OpenAPI para Asclepio.
 *
 * Este archivo centraliza toda la configuración de documentación.
 * Se inyecta en main.ts para mantener el bootstrap limpio.
 */
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Asclepio — Sistema Hospitalario')
    .setDescription(
      `
## API REST + GraphQL para la gestión hospitalaria Asclepio

---

### Autenticación
La API usa **JWT Bearer tokens**. El flujo de autenticación es:

1. **\`POST /auth/register\`** — Registrar usuario con hospital
2. **\`POST /auth/login\`** — Obtener \`preToken\` + lista de hospitales
3. **\`POST /auth/select-hospital\`** — Con el \`preToken\`, seleccionar hospital → obtener \`accessToken\`
4. Usar \`accessToken\` como \`Bearer {token}\` en todas las peticiones protegidas

**Inscripción a otros hospitales:**
- \`POST /auth/join-hospital\` — Con \`accessToken\`, inscribirse a hospital adicional

---

### GraphQL
El playground de GraphQL está disponible en \`/graphql\`.

**Subscriptions** se conectan vía WebSocket en \`ws://localhost:{PORT}/graphql\`.

---

### Roles disponibles
| Rol | Descripción | Tabla propia |
|-----|-------------|--------------|
| \`PACIENTE\` | Paciente del sistema | \`pacientes\` |
| \`MEDICO\` | Médico registrado | \`medicos\` |
| \`ENFERMERO\` | Enfermero registrado | \`enfermeros\` |
| \`RECEPCIONISTA\` | Recepcionista del hospital | — |
| \`ADMIN\` | Administrador | — |

---

### Sistema de Turnos (GraphQL)
Los turnos son manejados completamente por GraphQL.
Ver la sección de referencia al final de esta documentación.

**Subscriptions de turnos:**
- \`turnoActualizado(hospitalId)\` → Canal de sala de espera del hospital
- \`miTurnoActualizado(pacienteId)\` → Canal personal del paciente

---

### Filtrado por hospital
Todos los datos están aislados por hospital en el token JWT.
Los pacientes pueden ver todas sus citas independientemente del hospital.
      `.trim(),
    )
    .setVersion('1.0.0')
    .setContact('Equipo Asclepio', '', 'soporte@asclepio.com')
    .setLicense('UNLICENSED', '')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token JWT de sesión completo (con hospitalId). Obtenido en POST /auth/select-hospital.',
        name: 'Authorization',
        in: 'header',
      },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token temporal de login (5 min, sin hospitalId). Obtenido en POST /auth/login. Usar ÚNICAMENTE en POST /auth/select-hospital.',
        name: 'Authorization',
        in: 'header',
      },
      'JWT-preToken',
    )
    .addTag('Autenticación', 'Registro, login y gestión de acceso por hospital')
    .addServer('http://localhost:3000', 'Servidor de desarrollo')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Asclepio API Docs',
    customCss: `
      .swagger-ui .topbar { background-color: #1a365d; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { color: #1a365d; }
    `,
  });
}
