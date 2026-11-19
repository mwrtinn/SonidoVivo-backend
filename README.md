# Sonido Vivo · Backend

Backend del proyecto semestral **Sonido Vivo**, tienda en línea de instrumentos musicales y accesorios de audio.
DSY1104 · Desarrollo Fullstack II · Sección 006D · Duoc UC.

- **Frontend:** <https://github.com/mwrtinn/Proyecto-Semestral-SonidoVivo>
- **Integrantes:** Martín Faundez, Joaquín Orellana, Vicente Vega

## Alcance
API REST con Node.js y Express, base de datos PostgreSQL en Amazon RDS, autenticación con JWT y roles (Administrador, Vendedor, Cliente). En esta etapa están implementados los usuarios, el registro, el inicio de sesión y las rutas protegidas. El catálogo y los pedidos están diseñados y pendientes.

## Estado del trabajo

| Operación | Estado | Cómo se probó |
|---|---|---|
| Tabla de usuarios y roles | Listo | `sql/schema.sql` aplicado en RDS; los datos persisten al reiniciar el backend |
| Registro | Listo | `POST /api/v1/auth/register`: 201, 409 (email repetido) y 400 (datos inválidos) |
| Inicio de sesión | Listo | `POST /api/v1/auth/login`: 200 con JWT y 401 con mensaje genérico |
| Rutas protegidas con JWT | Listo | `GET /api/v1/auth/me`: 200 con token válido; 401 sin token y con token alterado |
| Modificar usuario | Pendiente | Diseñado; sin código |
| Listar usuarios | Pendiente | Diseñado; sin código |
| Eliminar o desactivar usuario | Pendiente | Diseñado; sin código |
| Swagger / OpenAPI | Pendiente | |
| Catálogo y pedidos | Pendiente | |

**Diseñado** significa que está planificado en este README. **Implementado** significa que hay código. **Probado** significa que se ejecutó y su resultado quedó registrado.

## Decisiones técnicas
- **Backend:** Node.js 24 con Express, ejecutado en una instancia EC2. Se reutiliza el trabajo de la guía 18 y se comparte lenguaje con el frontend React.
- **Base de datos:** PostgreSQL en Amazon RDS, privada (sin acceso público) y accesible solo desde la VPC. Se eligió un motor relacional por las claves foráneas, restricciones y transacciones que necesitan los pedidos y el stock.
- **Acceso a datos:** paquete `pg` con un pool de conexiones y consultas parametrizadas (`$1`, `$2`), para evitar inyección SQL.
- **Validación:** `zod`. Los DTO de entrada descartan campos no permitidos (por ejemplo, un `rol` enviado por el cliente).
- **Contraseñas:** `argon2id`. OWASP lo recomienda como primera opción para almacenar contraseñas, por ser costoso en memoria y resistente a ataques con GPU.
- **Cabeceras y CORS:** `helmet`, y CORS limitado a los orígenes del frontend definidos en `CORS_ORIGINS`.

## Organización del backend
```
server.js            Arranque del servidor y comprobación del JWT_SECRET
src/app.js           Express, middlewares globales y manejador de errores
src/routes/          Rutas HTTP
src/controllers/     Reciben la solicitud y devuelven el estado HTTP
src/services/        Reglas de negocio (hash, emisión y verificación del JWT)
src/repositories/    Consultas SQL
src/dto/             Validación de los datos de entrada (zod)
src/middlewares/     Autenticación JWT, autorización por rol y errores
src/db/              Conexión a PostgreSQL
sql/                 schema.sql y seed.sql
```

| Integrante | Responsabilidad actual |
|---|---|
| Martín Faundez | Repositorio, base de datos, registro, login, JWT y rutas protegidas |
| Joaquín Orellana | <completar> |
| Vicente Vega | <completar> |

## Diseño de datos
Diagrama entidad-relación: <ENLACE A DRIVE, CON ACCESO DE LECTURA PARA EL DOCENTE>

| Tabla | Estado | Notas |
|---|---|---|
| `roles` | Implementada | `nombre` único; roles iniciales en `seed.sql` |
| `usuarios` | Implementada | `email` único y siempre en minúsculas (CHECK); `password_hash`; `id_rol` con `ON DELETE RESTRICT`; `activo` |
| `direcciones`, `categorias`, `marcas`, `productos`, `pedidos`, `detalle_pedidos`, `pagos` | Diseñadas | Sin implementar |

## API

Rutas versionadas bajo `/api/v1`.

| Método y ruta | Acceso | Estado |
|---|---|---|
| `GET /health` | Público | Implementada |
| `POST /auth/register` | Público; el rol inicial siempre es Cliente | Implementada y probada |
| `POST /auth/login` | Público | Implementada y probada |
| `GET /auth/me` | Requiere `Authorization: Bearer <token>` | Implementada y probada |
| `GET /usuarios`, `PATCH /usuarios/:id`, `DELETE /usuarios/:id` | Según rol | Pendiente |

Respuesta del login:
```json
{ "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": "1h" }
```
Los errores tienen la forma `{ "mensaje": "...", "detalles": [] }`. Nunca se devuelve la contraseña ni su hash.

## Seguridad
- **Registro:** el servidor asigna el rol Cliente; un usuario no puede registrarse como administrador.
- **Login:** ante credenciales incorrectas, cuenta inexistente o cuenta inactiva responde el mismo `401` genérico. Se verifica un hash ficticio cuando el usuario no existe, para que el tiempo de respuesta no delate qué emails están registrados.
- **JWT:** firmado con HS256. Incluye `sub` (id de usuario), `exp`, `iss`, `aud` y el rol. Vigencia de 1 hora; no hay refresh token en esta etapa, así que al vencer se vuelve a iniciar sesión. El secreto está en el `.env`, fuera del repositorio.
- **Verificación:** se comprueban firma, algoritmo permitido (solo HS256), expiración, emisor y destinatario. Además, en cada solicitud se consulta la base para tomar el rol y el estado vigentes, y no los del token; una cuenta desactivada deja de tener acceso aunque conserve un token.
- **Respuestas:** `401` para token ausente, alterado o vencido; `403` cuando el rol no alcanza (el middleware de autorización existe y se usará en las rutas de usuarios).

**Pendiente o con limitación:**
- Límite de intentos de login (rate limiting).
- La conexión a RDS usa SSL con `rejectUnauthorized: false`: cifra, pero no valida el certificado del servidor.
- La API se sirve por HTTP; en producción debe ir tras HTTPS.
- Dónde guardar el token en el frontend y cómo persiste la sesión al recargar: por definir con el equipo.

## Cómo ejecutarlo
Requisitos: Node 24 y una base PostgreSQL accesible.

```bash
git clone <URL_DE_ESTE_REPOSITORIO>
cd SonidoVivo-backend
npm ci
cp .env.example .env     # completar DB_HOST, DB_USER, DB_PASSWORD y JWT_SECRET
psql "<cadena de conexión>" -f sql/schema.sql -f sql/seed.sql
npm start
```

`JWT_SECRET` debe tener al menos 32 caracteres; se puede generar con `openssl rand -hex 32`. No se suben al repositorio el `.env` ni ninguna credencial.

El registro público siempre crea un Cliente. El primer Administrador se crea promoviendo un usuario con SQL:
```sql
UPDATE usuarios SET id_rol = (SELECT id_rol FROM roles WHERE nombre = 'Administrador') WHERE email = '<email>';
```

## Pruebas realizadas
Con datos ficticios, usando `curl`:

| Caso | Resultado |
|---|---|
| Registro válido, aunque se envíe `"rol": "Administrador"` | 201; el usuario queda con rol Cliente |
| Registro con email repetido | 409 |
| Registro con datos inválidos | 400 con detalles |
| Login correcto | 200 con `accessToken` |
| Login con contraseña incorrecta o email inexistente | 401, mismo mensaje en ambos |
| `/auth/me` con token válido | 200 con el perfil, sin hash |
| `/auth/me` sin token | 401 |
| `/auth/me` con token alterado | 401 |

**Casos pendientes:** token vencido, rol insuficiente (403), acceso a datos de otra persona y reglas del catálogo y de los pedidos.

## Próximos pasos
Listar, modificar y desactivar usuarios con control de rol y propiedad; Swagger; diagrama de secuencia del login; formularios de login y registro en el frontend; después catálogo y pedidos.