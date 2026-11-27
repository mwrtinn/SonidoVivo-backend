
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const archivo = path.join(__dirname, 'openapi.yaml');

const documento = YAML.parseDocument(
  fs.readFileSync(archivo, 'utf8')
);

if (documento.errors.length > 0) {
  throw new Error('El archivo openapi.yaml contiene errores.');
}

const actual = documento.toJS();

const rutaProductos = Object.keys(actual.paths || {}).find(
  ruta => ruta === '/productos' || ruta === '/api/v1/productos'
);

if (!rutaProductos) {
  throw new Error('No se encontró la ruta existente de productos.');
}

const prefijo = rutaProductos.slice(0, -'/productos'.length);

const rutaPedidos = `${prefijo}/pedidos`;

const esquemaBearer = Object.keys(
  actual.components?.securitySchemes || {}
).find(nombre => {
  const esquema = actual.components.securitySchemes[nombre];

  return esquema.type === 'http' &&
    String(esquema.scheme).toLowerCase() === 'bearer';
});

if (!esquemaBearer) {
  throw new Error('No se encontró el esquema de autenticación Bearer.');
}

const seguridad = [
  { [esquemaBearer]: [] }
];

const estados = [
  'En preparación',
  'Enviado',
  'Listo para retiro',
  'Entregado',
  'Cancelado'
];

const referencia = nombre => ({
  $ref: `#/components/schemas/${nombre}`
});

const enteroPositivo = {
  type: 'integer',
  minimum: 1,
  maximum: 2147483647
};

const camposContacto = {
  nombre: {
    type: 'string',
    maxLength: 150,
    example: 'Cliente Prueba'
  },
  email: {
    type: 'string',
    format: 'email',
    maxLength: 254,
    example: 'prueba01@ejemplo.cl'
  },
  telefono: {
    type: 'string',
    maxLength: 30,
    example: '912345678'
  },
  entrega: {
    type: 'string',
    enum: ['despacho', 'retiro'],
    example: 'retiro'
  },
  direccion: {
    type: 'string',
    maxLength: 500,
    description: 'Obligatoria para despacho a domicilio.',
    example: ''
  }
};

const esquemas = {

  PedidoItemCreacion: {
    type: 'object',
    required: ['id_producto', 'cantidad'],
    properties: {
      id_producto: {
        ...enteroPositivo,
        example: 1
      },
      cantidad: {
        ...enteroPositivo,
        example: 2
      }
    }
  },

  PedidoCreacion: {
    type: 'object',
    description: 'El usuario se obtiene del JWT. Los precios y totales se calculan en el servidor.',
    required: [
      'nombre',
      'email',
      'telefono',
      'entrega',
      'items'
    ],
    properties: {
      ...camposContacto,
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: referencia('PedidoItemCreacion')
      }
    },
    example: {
      nombre: 'Cliente Prueba',
      email: 'prueba01@ejemplo.cl',
      telefono: '912345678',
      entrega: 'retiro',
      direccion: '',
      items: [
        {
          id_producto: 1,
          cantidad: 2
        }
      ]
    }
  },

  PedidoCambioEstado: {
    type: 'object',
    required: ['estado'],
    properties: {
      estado: {
        type: 'string',
        enum: estados,
        example: 'Listo para retiro'
      }
    }
  },

  PedidoItemRespuesta: {
    type: 'object',
    properties: {
      id: {
        type: 'integer'
      },
      id_producto: {
        type: 'integer'
      },
      codigo: {
        type: 'string',
        example: 'GA001'
      },
      nombre: {
        type: 'string',
        example: 'Guitarra Acústica Folk'
      },
      cantidad: {
        type: 'integer',
        example: 2
      },
      precio: {
        type: 'integer',
        example: 110492
      },
      precio_unitario: {
        type: 'integer',
        example: 110492
      },
      subtotal: {
        type: 'integer',
        format: 'int64',
        example: 220984
      }
    }
  },

  PedidoRespuesta: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        example: 1
      },
      id_pedido: {
        type: 'integer',
        example: 1
      },
      id_usuario: {
        oneOf: [
          { type: 'integer' },
          { type: 'string' }
        ]
      },
      ...camposContacto,
      estado: {
        type: 'string',
        enum: estados,
        example: 'En preparación'
      },
      total: {
        type: 'integer',
        format: 'int64',
        example: 220984
      },
      fecha: {
        type: 'string',
        format: 'date-time'
      },
      fecha_actualizacion: {
        type: 'string',
        format: 'date-time'
      }
    }
  },

  PedidoDetalleRespuesta: {
    allOf: [
      referencia('PedidoRespuesta'),
      {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: referencia('PedidoItemRespuesta')
          }
        }
      }
    ]
  },

  PedidoError: {
    type: 'object',
    properties: {
      mensaje: {
        type: 'string'
      },
      detalles: {
        type: 'array',
        items: {
          type: 'string'
        }
      }
    }
  }
};

function respuesta(descripcion, schema) {
  return {
    description: descripcion,
    content: {
      'application/json': {
        schema
      }
    }
  };
}

function error(descripcion) {
  return respuesta(
    descripcion,
    referencia('PedidoError')
  );
}

function cuerpo(nombre) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: referencia(nombre)
      }
    }
  };
}

const parametroId = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Identificador del pedido.',
  schema: enteroPositivo
};

const rutas = {

  [rutaPedidos]: {

    get: {
      tags: ['Pedidos'],
      summary: 'Listar pedidos',
      description: 'Cliente: consulta únicamente sus pedidos. Administrador y Vendedor: consultan todos los pedidos.',
      security: seguridad,
      responses: {
        '200': respuesta(
          'Listado de pedidos.',
          {
            type: 'array',
            items: referencia('PedidoRespuesta')
          }
        ),
        '401': error('Token ausente, inválido o vencido.'),
        '403': error('No tiene permisos.'),
        '500': error('Error interno del servidor.')
      }
    },

    post: {
      tags: ['Pedidos'],
      summary: 'Crear pedido',
      description: 'Exclusivo del Cliente. Registra el pedido, calcula precios y descuentos, valida stock y descuenta existencias en una única transacción.',
      security: seguridad,
      requestBody: cuerpo('PedidoCreacion'),
      responses: {
        '201': respuesta(
          'Pedido registrado correctamente.',
          referencia('PedidoDetalleRespuesta')
        ),
        '400': error('Datos del pedido inválidos.'),
        '401': error('Token ausente, inválido o vencido.'),
        '403': error('Solo los clientes pueden crear pedidos.'),
        '409': error('Stock insuficiente o producto no disponible.'),
        '500': error('Error interno del servidor.')
      }
    }
  },

  [`${rutaPedidos}/{id}`]: {

    get: {
      tags: ['Pedidos'],
      summary: 'Consultar detalle de pedido',
      description: 'Cliente: solo pedidos propios. Administrador y Vendedor: cualquier pedido.',
      security: seguridad,
      parameters: [parametroId],
      responses: {
        '200': respuesta(
          'Detalle del pedido.',
          referencia('PedidoDetalleRespuesta')
        ),
        '400': error('ID del pedido inválido.'),
        '401': error('Token ausente, inválido o vencido.'),
        '403': error('No tiene permisos.'),
        '404': error('Pedido inexistente o no pertenece al cliente.'),
        '500': error('Error interno del servidor.')
      }
    }
  },

  [`${rutaPedidos}/{id}/estado`]: {

    patch: {
      tags: ['Pedidos'],
      summary: 'Cambiar estado del pedido',
      description: [
        'Exclusivo de Administrador y Vendedor.',
        'Despacho: En preparación → Enviado → Entregado.',
        'Retiro: En preparación → Listo para retiro → Entregado.',
        'Solo se puede cancelar desde En preparación.',
        'La cancelación restaura el stock una única vez.',
        'Entregado y Cancelado son estados finales.'
      ].join('\n'),
      security: seguridad,
      parameters: [parametroId],
      requestBody: cuerpo('PedidoCambioEstado'),
      responses: {
        '200': respuesta(
          'Estado actualizado correctamente.',
          referencia('PedidoDetalleRespuesta')
        ),
        '400': error('ID o estado inválido.'),
        '401': error('Token ausente, inválido o vencido.'),
        '403': error('No tiene permisos.'),
        '404': error('Pedido no encontrado.'),
        '409': error('Transición de estado no permitida o conflicto de stock.'),
        '500': error('Error interno del servidor.')
      }
    }
  }
};

if (!documento.hasIn(['components', 'schemas'])) {
  documento.setIn(['components', 'schemas'], {});
}

for (const [nombre, esquema] of Object.entries(esquemas)) {
  documento.setIn(
    ['components', 'schemas', nombre],
    esquema
  );
}

for (const [ruta, operaciones] of Object.entries(rutas)) {
  documento.setIn(
    ['paths', ruta],
    operaciones
  );
}

if (!documento.has('tags')) {
  documento.set('tags', []);
}

if (!(actual.tags || []).some(tag => tag.name === 'Pedidos')) {
  documento.addIn(
    ['tags'],
    {
      name: 'Pedidos',
      description: 'Registro, consulta y administración de pedidos.'
    }
  );
}

fs.writeFileSync(
  archivo,
  documento.toString(),
  'utf8'
);

console.log('Documentación de pedidos agregada correctamente.');
console.log('Esquema de seguridad:', esquemaBearer);
console.log('Endpoints incorporados:');

console.log('GET   ' + rutaPedidos);
console.log('POST  ' + rutaPedidos);
console.log('GET   ' + rutaPedidos + '/{id}');
console.log('PATCH ' + rutaPedidos + '/{id}/estado');
