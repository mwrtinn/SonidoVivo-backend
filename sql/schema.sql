CREATE TABLE roles (
  id_rol integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(50) NOT NULL UNIQUE,
  descripcion text,
  fecha_creacion timestamp NOT NULL DEFAULT now()
);

CREATE TABLE usuarios (
  id_usuario integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  email varchar(150) NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash varchar(255) NOT NULL,
  id_rol integer NOT NULL REFERENCES roles(id_rol) ON DELETE RESTRICT,
  activo boolean NOT NULL DEFAULT true,
  fecha_registro timestamp NOT NULL DEFAULT now()
);