
function validarProducto(cuerpo, parcial = false) {
  const datos = {};
  const errores = [];

  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    return {
      datos,
      errores: ['El cuerpo debe ser un objeto JSON.']
    };
  }

  const obligatorios = {
    codigo: 30,
    categoria: 100,
    nombre: 150
  };

  for (const [campo, maximo] of Object.entries(obligatorios)) {
    if (parcial && cuerpo[campo] === undefined) continue;

    const valor = cuerpo[campo];

    if (
      typeof valor !== 'string' ||
      !valor.trim() ||
      valor.trim().length > maximo
    ) {
      errores.push(`${campo} debe tener entre 1 y ${maximo} caracteres.`);
    } else {
      datos[campo] = valor.trim();
    }
  }

  const opcionales = {
    marca: 100,
    modelo: 100,
    descripcion: 10000,
    imagen: 2000
  };

  for (const [campo, maximo] of Object.entries(opcionales)) {
    if (cuerpo[campo] === undefined) continue;

    const valor = cuerpo[campo];

    if (valor === null) {
      datos[campo] = null;
    } else if (
      typeof valor !== 'string' ||
      valor.length > maximo
    ) {
      errores.push(`${campo} no es válido.`);
    } else {
      datos[campo] = valor.trim() || null;
    }
  }

  const numericos = {
    stock: 2147483647,
    precio: 2147483647,
    descuento: 100
  };

  for (const [campo, maximo] of Object.entries(numericos)) {
    const valor = cuerpo[campo];

    if (valor === undefined) {
      if (!parcial && campo === 'precio') {
        errores.push('El precio es obligatorio.');
      }
      continue;
    }

    if (
      !Number.isInteger(valor) ||
      valor < 0 ||
      valor > maximo
    ) {
      errores.push(`${campo} debe ser un entero entre 0 y ${maximo}.`);
    } else {
      datos[campo] = valor;
    }
  }

  for (const campo of ['enOferta', 'activo']) {
    if (cuerpo[campo] === undefined) continue;

    if (typeof cuerpo[campo] !== 'boolean') {
      errores.push(`${campo} debe ser true o false.`);
    } else {
      datos[campo] = cuerpo[campo];
    }
  }

  if (parcial && Object.keys(datos).length === 0) {
    errores.push('Debes proporcionar al menos un campo válido.');
  }

  return { datos, errores };
}

module.exports = { validarProducto };
