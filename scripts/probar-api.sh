#!/usr/bin/env bash
# Pruebas de humo de la API (datos ficticios). Con la API encendida:
#   BASE=http://localhost:3000/api/v1 bash scripts/probar-api.sh
# Opcional, para probar las rutas de Administrador (promover antes a un usuario con SQL):
#   ADMIN_EMAIL=admin@ejemplo.cl ADMIN_CLAVE=Clave12345 bash scripts/probar-api.sh
BASE="${BASE:-http://localhost:3000/api/v1}"
RESP="$(mktemp)"
SUFIJO="$(date +%s)"
CLAVE="Clave12345"
OK=0
FALLAS=0

llamar() { # metodo ruta [cuerpo] [token]
  local args=(-s -o "$RESP" -w '%{http_code}' -X "$1" "$BASE$2" -H 'Content-Type: application/json')
  [ -n "$3" ] && args+=(-d "$3")
  [ -n "$4" ] && args+=(-H "Authorization: Bearer $4")
  curl "${args[@]}"
}
campo() { node -pe "JSON.parse(require('fs').readFileSync('$RESP','utf8'))$1"; }
verificar() { # descripcion esperado obtenido
  if [ "$2" = "$3" ]; then echo "OK     $1 ($3)"; OK=$((OK+1)); else echo "FALLA  $1 (esperado $2, obtenido $3)"; FALLAS=$((FALLAS+1)); fi
}

echo "== Registro =="
E=$(llamar POST /auth/register "{\"nombre\":\"Ana Prueba\",\"email\":\"ana$SUFIJO@ejemplo.cl\",\"clave\":\"$CLAVE\",\"rol\":\"Administrador\"}")
verificar "Registro valido" 201 "$E"
verificar "El rol queda Cliente aunque se envie Administrador" Cliente "$(campo .rol)"
verificar "La respuesta no expone el hash" 0 "$(grep -c password_hash "$RESP")"
ID_ANA=$(campo .id_usuario)
E=$(llamar POST /auth/register "{\"nombre\":\"Ana Prueba\",\"email\":\"ana$SUFIJO@ejemplo.cl\",\"clave\":\"$CLAVE\"}")
verificar "Registro con email repetido" 409 "$E"
E=$(llamar POST /auth/register '{"nombre":"A","email":"x","clave":"1"}')
verificar "Registro con datos invalidos" 400 "$E"
E=$(llamar POST /auth/register "{\"nombre\":\"Beto Prueba\",\"email\":\"beto$SUFIJO@ejemplo.cl\",\"clave\":\"$CLAVE\"}")
verificar "Segundo usuario" 201 "$E"
ID_BETO=$(campo .id_usuario)

echo "== Login =="
E=$(llamar POST /auth/login "{\"email\":\"ana$SUFIJO@ejemplo.cl\",\"clave\":\"$CLAVE\"}")
verificar "Login correcto" 200 "$E"
T_ANA=$(campo .accessToken)
E=$(llamar POST /auth/login "{\"email\":\"ana$SUFIJO@ejemplo.cl\",\"clave\":\"mala12345\"}")
verificar "Login con clave incorrecta" 401 "$E"
MSG1=$(campo .mensaje)
E=$(llamar POST /auth/login '{"email":"noexiste@ejemplo.cl","clave":"mala12345"}')
verificar "Login con email inexistente" 401 "$E"
verificar "Mismo mensaje en ambos casos de login fallido" "$MSG1" "$(campo .mensaje)"
E=$(llamar POST /auth/login "{\"email\":\"beto$SUFIJO@ejemplo.cl\",\"clave\":\"$CLAVE\"}")
T_BETO=$(campo .accessToken)

echo "== Token =="
E=$(llamar GET /auth/me "" "$T_ANA")
verificar "/auth/me con token valido" 200 "$E"
E=$(llamar GET /auth/me)
verificar "/auth/me sin token" 401 "$E"
E=$(llamar GET /auth/me "" "${T_ANA}x")
verificar "/auth/me con token alterado" 401 "$E"

echo "== Permisos como Cliente =="
E=$(llamar GET /usuarios "" "$T_ANA")
verificar "Cliente no puede listar usuarios" 403 "$E"
E=$(llamar GET /usuarios)
verificar "Listar sin token" 401 "$E"
E=$(llamar PATCH "/usuarios/$ID_ANA" '{"nombre":"Ana Editada"}' "$T_ANA")
verificar "Cliente modifica su propio nombre" 200 "$E"
E=$(llamar PATCH "/usuarios/$ID_ANA" '{"rol":"Administrador"}' "$T_ANA")
verificar "Cliente no puede cambiarse el rol" 403 "$E"
E=$(llamar PATCH "/usuarios/$ID_BETO" '{"nombre":"Hackeado"}' "$T_ANA")
verificar "Cliente no puede modificar a otra persona (id en la URL)" 403 "$E"
E=$(llamar DELETE "/usuarios/$ID_BETO" "" "$T_ANA")
verificar "Cliente no puede desactivar usuarios" 403 "$E"

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_CLAVE" ]; then
  echo "== Permisos como Administrador =="
  E=$(llamar POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"clave\":\"$ADMIN_CLAVE\"}")
  verificar "Login del Administrador" 200 "$E"
  T_ADM=$(campo .accessToken)
  E=$(llamar GET /auth/me "" "$T_ADM"); ID_ADM=$(campo .id_usuario)
  E=$(llamar GET /usuarios "" "$T_ADM")
  verificar "Administrador lista usuarios" 200 "$E"
  E=$(llamar PATCH /usuarios/999999 '{"nombre":"Nadie"}' "$T_ADM")
  verificar "Modificar usuario inexistente" 404 "$E"
  E=$(llamar PATCH /usuarios/abc '{"nombre":"Nadie"}' "$T_ADM")
  verificar "Identificador invalido" 400 "$E"
  E=$(llamar PATCH "/usuarios/$ID_ANA" '{"rol":"Vendedor"}' "$T_ADM")
  verificar "Administrador cambia el rol de otro usuario" 200 "$E"
  verificar "El rol quedo como Vendedor" Vendedor "$(campo .rol)"
  E=$(llamar DELETE "/usuarios/$ID_ADM" "" "$T_ADM")
  verificar "Administrador no puede desactivarse a si mismo" 409 "$E"
  E=$(llamar DELETE "/usuarios/$ID_BETO" "" "$T_ADM")
  verificar "Administrador desactiva a Beto" 204 "$E"
  E=$(llamar POST /auth/login "{\"email\":\"beto$SUFIJO@ejemplo.cl\",\"clave\":\"$CLAVE\"}")
  verificar "Beto desactivado ya no inicia sesion" 401 "$E"
  E=$(llamar GET /auth/me "" "$T_BETO")
  verificar "El token anterior de Beto deja de servir" 401 "$E"
else
  echo "(Se omiten las pruebas de Administrador: define ADMIN_EMAIL y ADMIN_CLAVE)"
fi

echo
echo "Resultado: $OK correctas, $FALLAS fallidas"
rm -f "$RESP"
[ "$FALLAS" -eq 0 ]
