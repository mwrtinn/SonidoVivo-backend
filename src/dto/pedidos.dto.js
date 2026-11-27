
const ESTADOS_PEDIDO = [
  'En preparación',
  'Enviado',
  'Listo para retiro',
  'Entregado',
  'Cancelado'
];

const MAX_ENTERO = 2147483647;

function validarPedido(cuerpo) {
  const datos = {};
  const errores = [];

  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    return {
      datos,
      errores: ['El cuerpo de la solicitud debe ser un objeto.']
    };
  }

  function validarTexto(campo, maximo) {
    const valor = cuerpo[campo];

    if (
      typeof valor !== 'string' ||
      !valor.trim() ||
      valor.trim().length > maximo
    ) {
      errores.push(
        `${campo} es obligatorio y admite hasta ${maximo} caracteres.`
      );

      return;
    }

    datos[campo] = valor.trim();
  }

  validarTexto('nombre', 150);
  validarTexto('email', 254);
  validarTexto('telefono', 30);

  if (datos.email) {
    datos.email = datos.email.toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
      errores.push('El correo electrónico no es válido.');
    }
  }

  if (
    datos.telefono &&
    (
      !/^[+\d\s()-]+$/.test(datos.telefono) ||
      datos.telefono.replace(/\D/g, '').length < 7
    )
  ) {
    errores.push('El teléfono no es válido.');
  }

  if (!['despacho', 'retiro'].includes(cuerpo.entrega)) {
    errores.push('La entrega debe ser despacho o retiro.');
  } else {
    datos.entrega = cuerpo.entrega;
  }

  if (cuerpo.entrega === 'despacho') {
    validarTexto('direccion', 500);
  } else {
    datos.direccion = '';
  }

  if (
    !Array.isArray(cuerpo.items) ||
    cuerpo.items.length === 0 ||
    cuerpo.items.length > 100
  ) {
    errores.push('El pedido debe contener entre 1 y 100 productos.');
  } else {
    datos.items = [];

    const productosVistos = new Set();

    cuerpo.items.forEach((item, indice) => {
      if (!item || typeof item !== 'object') {
        errores.push(`Producto ${indice + 1} inválido.`);
        return;
      }

      const { id_producto, cantidad } = item;

      if (
        !Number.isInteger(id_producto) ||
        id_producto <= 0 ||
        id_producto > MAX_ENTERO
      ) {
        errores.push(
          `ID inválido en el producto ${indice + 1}.`
        );

        return;
      }

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0 ||
        cantidad > MAX_ENTERO
      ) {
        errores.push(
          `Cantidad inválida para el producto ${id_producto}.`
        );

        return;
      }

      if (productosVistos.has(id_producto)) {
        errores.push(
          `El producto ${id_producto} está repetido.`
        );

        return;
      }

      productosVistos.add(id_producto);

      datos.items.push({
        id_producto,
        cantidad
      });
    });
  }

  return { datos, errores };
}

function validarEstado(cuerpo) {
  const datos = {};
  const errores = [];

  if (!ESTADOS_PEDIDO.includes(cuerpo?.estado)) {
    errores.push('El estado del pedido no es válido.');
  } else {
    datos.estado = cuerpo.estado;
  }

  return { datos, errores };
}

module.exports = {
  ESTADOS_PEDIDO,
  validarPedido,
  validarEstado
};
