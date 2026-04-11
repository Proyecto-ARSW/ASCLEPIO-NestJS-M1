-- Recomendado si Postgres < 13:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE rol_usuario AS ENUM ('PACIENTE', 'MEDICO', 'ADMIN', 'RECEPCIONISTA', 'ENFERMERO');
CREATE TYPE estado_cita AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'POSPUESTA', 'COMPLETADA');
CREATE TYPE estado_turno AS ENUM ('EN_ESPERA', 'EN_CONSULTA', 'ATENDIDO', 'CANCELADO');
CREATE TYPE tipo_turno AS ENUM ('NORMAL', 'PRIORITARIO', 'URGENTE');
CREATE TYPE disponibilidad_medicamento AS ENUM ('DISPONIBLE', 'STOCK_BAJO', 'AGOTADO');


-- =====================================================================
-- USUARIOS Y PERFILES
-- =====================================================================

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    rol             rol_usuario NOT NULL DEFAULT 'PACIENTE',
    telefono        VARCHAR(20),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pacientes (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id               UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_nacimiento         DATE,
    -- Valor cifrado AES-256-GCM: formato "iv_hex:authTag_hex:ciphertext_hex"
    -- VARCHAR(200) cubre el overhead del cifrado (~70 chars para valores cortos)
    tipo_sangre              VARCHAR(200),
    numero_documento         VARCHAR(200),
    -- HMAC-SHA256 del numero_documento en plaintext. Determinístico: permite
    -- búsquedas indexadas sin exponer el dato real. UNIQUE reemplaza al de numero_documento.
    numero_documento_hmac    VARCHAR(64) UNIQUE,
    tipo_documento           VARCHAR(20) DEFAULT 'CC',
    eps                      VARCHAR(100),
    alergias                 TEXT,
    creado_en                TIMESTAMP NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- CATÁLOGOS BASE
-- =====================================================================

CREATE TABLE especialidades (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE formacion (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE categorias_medicamento (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE sedes (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    direccion   TEXT,
    ciudad      VARCHAR(100)
);


-- =====================================================================
-- HOSPITALES (antes de turnos por la FK)
-- =====================================================================

CREATE TABLE hospitales (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    nit                 VARCHAR(20) UNIQUE,
    departamento        VARCHAR(50) NOT NULL,
    ciudad              VARCHAR(50) NOT NULL,
    direccion           VARCHAR(200) NOT NULL,
    telefono            VARCHAR(20),
    email_contacto      VARCHAR(150),
    tipo_institucion    VARCHAR(50),
    capacidad_urgencias INT,
    numero_consultorios SMALLINT,
    latitud             DECIMAL(10, 8),
    longitud            DECIMAL(11, 8),
    activo              BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_hospitales_ciudad ON hospitales(ciudad);
CREATE INDEX idx_hospitales_activo ON hospitales(activo);


-- =====================================================================
-- MÉDICOS Y ENFERMEROS
-- =====================================================================

CREATE TABLE medicos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad_id INT NOT NULL REFERENCES especialidades(id),
    numero_registro VARCHAR(50) UNIQUE NOT NULL,
    consultorio     VARCHAR(20),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE enfermeros (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id           UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    numero_registro      VARCHAR(50) UNIQUE NOT NULL,
    nivel_formacion      INT NOT NULL REFERENCES formacion(id),
    area_especializacion INT NOT NULL REFERENCES especialidades(id),
    certificacion_triage BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_certificacion  DATE,
    activo               BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE disponibilidad_enfermero (
    id           SERIAL PRIMARY KEY,
    enfermero_id UUID NOT NULL REFERENCES enfermeros(id) ON DELETE CASCADE,
    dia_semana   SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio  TIME NOT NULL,
    hora_fin     TIME NOT NULL,
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(enfermero_id, dia_semana, hora_inicio)
);

CREATE INDEX idx_enfermeros_usuario       ON enfermeros(usuario_id);
CREATE INDEX idx_enfermeros_activo        ON enfermeros(activo);
CREATE INDEX idx_enfermeros_certificacion ON enfermeros(certificacion_triage);

CREATE TABLE disponibilidad_medico (
    id            SERIAL PRIMARY KEY,
    medico_id     UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    duracion_cita SMALLINT NOT NULL DEFAULT 30,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(medico_id, dia_semana, hora_inicio)
);


-- =====================================================================
-- CITAS
-- =====================================================================

CREATE TABLE citas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id         UUID NOT NULL REFERENCES pacientes(id),
    medico_id           UUID NOT NULL REFERENCES medicos(id),
    fecha_hora          TIMESTAMP NOT NULL,
    duracion_minutos    SMALLINT NOT NULL DEFAULT 30,
    estado              estado_cita NOT NULL DEFAULT 'PENDIENTE',
    motivo              TEXT,
    notas_medico        TEXT,
    reagendada_de       UUID REFERENCES citas(id),
    cancelada_por       UUID REFERENCES usuarios(id),
    motivo_cancelacion  TEXT,
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(medico_id, fecha_hora)
);

CREATE INDEX idx_citas_paciente     ON citas(paciente_id);
CREATE INDEX idx_citas_medico_fecha ON citas(medico_id, fecha_hora);
CREATE INDEX idx_citas_estado       ON citas(estado);


-- =====================================================================
-- TURNOS (hospitales ya existe aquí)
-- =====================================================================

CREATE TABLE turnos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id     UUID NOT NULL REFERENCES pacientes(id),
    medico_id       UUID REFERENCES medicos(id),
    especialidad_id INT REFERENCES especialidades(id),
    hospital_id     INT REFERENCES hospitales(id),
    numero_turno    SMALLINT NOT NULL,
    tipo            tipo_turno NOT NULL DEFAULT 'NORMAL',
    estado          estado_turno NOT NULL DEFAULT 'EN_ESPERA',
    posicion_cola   INTEGER,                              -- INTEGER > SMALLINT para mayor capacidad
    llamado_en      TIMESTAMP,
    atendido_en     TIMESTAMP,
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
    -- UNIQUE inline removido por comportamiento de NULLs en Postgres
);

-- Unicidad real del número de turno por hospital y día
CREATE UNIQUE INDEX idx_turnos_unique_hospital_fecha_numero
    ON turnos(hospital_id, fecha, numero_turno)
    WHERE hospital_id IS NOT NULL;

CREATE INDEX idx_turnos_hospital_fecha_estado ON turnos(hospital_id, fecha, estado);

CREATE INDEX idx_turnos_fecha_estado ON turnos(fecha, estado);
CREATE INDEX idx_turnos_paciente     ON turnos(paciente_id);
CREATE INDEX idx_turnos_hospital     ON turnos(hospital_id);


-- =====================================================================
-- NOTIFICACIONES
-- =====================================================================

CREATE TABLE notificaciones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo        VARCHAR(200) NOT NULL,
    mensaje       TEXT NOT NULL,
    tipo          VARCHAR(50) NOT NULL,
    leida         BOOLEAN NOT NULL DEFAULT FALSE,
    referencia_id UUID,
    creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id, leida);


-- =====================================================================
-- MEDICAMENTOS E INVENTARIO
-- =====================================================================

CREATE TABLE medicamentos (
    id                  SERIAL PRIMARY KEY,
    nombre_comercial    VARCHAR(150) NOT NULL,
    nombre_generico     VARCHAR(150),
    categoria_id        INT REFERENCES categorias_medicamento(id),
    descripcion         TEXT,
    indicaciones        TEXT,
    contraindicaciones  TEXT,
    presentacion        VARCHAR(100),
    requiere_receta     BOOLEAN NOT NULL DEFAULT TRUE,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicamentos_nombre ON medicamentos(nombre_comercial, nombre_generico);

CREATE TABLE inventario_medicamentos (
    id             SERIAL PRIMARY KEY,
    medicamento_id INT NOT NULL REFERENCES medicamentos(id),
    sede_id        INT NOT NULL REFERENCES sedes(id),
    stock_actual   INT NOT NULL DEFAULT 0,
    stock_minimo   INT NOT NULL DEFAULT 10,
    disponibilidad disponibilidad_medicamento NOT NULL DEFAULT 'DISPONIBLE',
    precio         DECIMAL(10,2),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(medicamento_id, sede_id)
);

-- FIX #3 Postgres: asignación con := dentro de PL/pgSQL
CREATE OR REPLACE FUNCTION actualizar_disponibilidad()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_actual = 0 THEN
        NEW.disponibilidad := 'AGOTADO';
    ELSIF NEW.stock_actual <= NEW.stock_minimo THEN
        NEW.disponibilidad := 'STOCK_BAJO';
    ELSE
        NEW.disponibilidad := 'DISPONIBLE';
    END IF;
    NEW.actualizado_en := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_disponibilidad_medicamento
BEFORE INSERT OR UPDATE ON inventario_medicamentos
FOR EACH ROW EXECUTE FUNCTION actualizar_disponibilidad();


-- =====================================================================
-- HISTORIAL, RECETAS Y AUTH
-- =====================================================================

CREATE TABLE historial_medico (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id   UUID NOT NULL REFERENCES pacientes(id),
    cita_id       UUID REFERENCES citas(id),
    medico_id     UUID NOT NULL REFERENCES medicos(id),
    diagnostico   TEXT,
    tratamiento   TEXT,
    observaciones TEXT,
    creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE recetas (
    id             SERIAL PRIMARY KEY,
    historial_id   UUID NOT NULL REFERENCES historial_medico(id),
    medicamento_id INT NOT NULL REFERENCES medicamentos(id),
    dosis          VARCHAR(100),
    frecuencia     VARCHAR(100),
    duracion_dias  SMALLINT,
    observaciones  TEXT
);

CREATE TABLE refresh_tokens (
    id         SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    expira_en  TIMESTAMP NOT NULL,
    revocado   BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en  TIMESTAMP NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- HOSPITAL_USUARIO Y CONSENTIMIENTOS
-- =====================================================================

CREATE TABLE hospital_usuario (
    id                SERIAL PRIMARY KEY,
    hospital_id       INT NOT NULL REFERENCES hospitales(id) ON DELETE CASCADE,
    usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_en_hospital   VARCHAR(50),
    fecha_vinculacion DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(hospital_id, usuario_id)
);

CREATE INDEX idx_hospital_usuario_hospital ON hospital_usuario(hospital_id);
CREATE INDEX idx_hospital_usuario_usuario  ON hospital_usuario(usuario_id);

CREATE TABLE consentimientos_paciente (
    id                      SERIAL PRIMARY KEY,
    paciente_id             UUID NOT NULL REFERENCES pacientes(id),
    tipo_consentimiento     VARCHAR(100) NOT NULL,
    consentimiento_otorgado BOOLEAN NOT NULL,
    fecha_consentimiento    TIMESTAMP NOT NULL DEFAULT NOW(),
    revocado                BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_revocacion        TIMESTAMP,
    documento_firmado       TEXT
);


-- =====================================================================
-- DATOS INICIALES
-- =====================================================================

INSERT INTO especialidades (nombre, descripcion) VALUES
('Medicina General', 'Atención primaria y consulta general'),
('Cardiología',      'Enfermedades del corazón y sistema cardiovascular'),
('Pediatría',        'Atención médica a niños y adolescentes'),
('Dermatología',     'Enfermedades de la piel'),
('Ginecología',      'Salud femenina y reproductiva'),
('Neurología',       'Enfermedades del sistema nervioso'),
('Ortopedia',        'Huesos, músculos y articulaciones');

INSERT INTO categorias_medicamento (nombre) VALUES
('Analgésico'),
('Antibiótico'),
('Antiinflamatorio'),
('Antihistamínico'),
('Antihipertensivo'),
('Vitaminas y suplementos');

INSERT INTO formacion (nombre, descripcion) VALUES
('Auxiliar',     'Formación técnica de 1-2 años. Realiza cuidados básicos bajo supervisión. No autorizado para triage autónomo.'),
('Técnico',      'Formación tecnológica de 2-3 años. Cuidados de mediana complejidad. Puede realizar triage con supervisión.'),
('Profesional',  'Pregrado universitario de 4-5 años. Ejercicio autónomo. Autorizado para triage según Resolución 5596/2015.'),
('Especialista', 'Postgrado en área específica. Formación avanzada en Urgencias, UCI, Pediatría u otras especialidades.');

INSERT INTO sedes (nombre, direccion, ciudad) VALUES
('Sede Principal', 'Calle 1 # 2-3',      'Bogotá'),
('Sede Norte',     'Carrera 15 # 80-20', 'Bogotá');

INSERT INTO hospitales (
    nombre,
    nit,
    departamento,
    ciudad,
    direccion,
    telefono,
    email_contacto,
    tipo_institucion,
    capacidad_urgencias,
    numero_consultorios,
    latitud,
    longitud,
    activo
) VALUES (
    'Hospital Central de El Cerrito',
    '900123456-7',
    'Valle del Cauca',
    'El Cerrito',
    'Calle 5 #10-20',
    '+57 3123456789',
    'contacto@hospitalcerrito.com',
    'Pública',
    50,
    20,
    3.6851,
    -76.3132,
    TRUE
);
