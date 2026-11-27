
CREATE TABLE IF NOT EXISTS productos (
  id_producto integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  codigo varchar(30) NOT NULL UNIQUE,
  categoria varchar(100) NOT NULL,
  nombre varchar(150) NOT NULL,
  marca varchar(100),
  modelo varchar(100),

  stock integer NOT NULL DEFAULT 0
    CHECK (stock >= 0),

  precio integer NOT NULL
    CHECK (precio >= 0),

  descripcion text,
  imagen text,

  en_oferta boolean NOT NULL DEFAULT false,

  descuento integer NOT NULL DEFAULT 0
    CHECK (descuento BETWEEN 0 AND 100),

  activo boolean NOT NULL DEFAULT true,

  fecha_creacion timestamp NOT NULL DEFAULT now(),
  fecha_actualizacion timestamp NOT NULL DEFAULT now()
);
