
BEGIN;

CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_usuario BIGINT NOT NULL,

    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    telefono VARCHAR(30) NOT NULL,

    entrega VARCHAR(20) NOT NULL
        CHECK (entrega IN ('despacho', 'retiro')),

    direccion VARCHAR(500) NOT NULL DEFAULT '',

    estado VARCHAR(30) NOT NULL DEFAULT 'En preparación'
        CHECK (
            estado IN (
                'En preparación',
                'Enviado',
                'Listo para retiro',
                'Entregado',
                'Cancelado'
            )
        ),

    total BIGINT NOT NULL DEFAULT 0
        CHECK (total >= 0),

    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pedidos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pedidos_direccion
        CHECK (
            entrega = 'retiro'
            OR LENGTH(TRIM(direccion)) > 0
        )
);


CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_pedido INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(150) NOT NULL,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    precio_unitario INTEGER NOT NULL
        CHECK (precio_unitario >= 0),

    subtotal BIGINT GENERATED ALWAYS AS (
        cantidad::BIGINT * precio_unitario
    ) STORED,

    CONSTRAINT fk_detalle_pedido
        FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE RESTRICT,

    CONSTRAINT fk_detalle_producto
        FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE RESTRICT,

    CONSTRAINT uq_pedido_producto
        UNIQUE (id_pedido, id_producto)
);


CREATE INDEX IF NOT EXISTS idx_pedidos_usuario
    ON pedidos(id_usuario);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado
    ON pedidos(estado);

CREATE INDEX IF NOT EXISTS idx_pedidos_fecha
    ON pedidos(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_detalle_producto
    ON detalle_pedido(id_producto);

COMMIT;
