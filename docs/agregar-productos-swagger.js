
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const archivo = path.join(__dirname, 'openapi.yaml');

const doc = YAML.parseDocument(
  fs.readFileSync(archivo, 'utf8')
);

if (doc.errors.length) {
  throw new Error('El archivo OpenAPI contiene errores.');
}

const actual = doc.toJS();

const esquemasSeguridad =
  actual.components?.securitySchemes || {};

const bearer = Object.keys(esquemasSeguridad).find(
  nombre =>
    esquemasSeguridad[nombre].type === 'http' &&
    esquemasSeguridad[nombre].scheme?.toLowerCase() === 'bearer'
);

if (!bearer) {
  throw new Error('No se encontró el esquema de seguridad Bearer JWT.');
}

const prefijo = actual.paths['/usuarios']
  ? ''
  : actual.paths['/api/v1/usuarios']
    ? '/api/v1'
    : null;

if (prefijo === null) {
  throw new Error('No se pudo identificar el prefijo de las rutas.');
}

const seguridad = [{ [bearer]: [] }];

const referencia = nombre => ({
  $ref: `#/components/schemas/${nombre}`
});

const respuesta = (descripcion, schema) => ({
  description: descripcion,
  ...(schema ? {
    content: {
      'application/json': { schema }
    }
  } : {})
});

const error = descripcion =>
  respuesta(descripcion, referencia('ProductoError'));

const textoOpcional = maxLength => ({
  type: 'string',
  nullable: true,
  maxLength
});

const propiedades = {
  codigo: {
    type: 'string',
    maxLength: 30,
    example: 'PRUEBA001'
  },
  categoria: {
    type: 'string',
    maxLength: 100,
    example: 'Accesorios'
  },
  nombre: {
    type: 'string',
    maxLength: 150,
    example: 'Producto de prueba'
  },
  marca: textoOpcional(100),
  modelo: textoOpcional(100),
  stock: {
    type: 'integer',
    minimum: 0,
    maximum: 2147483647,
    example: 10
  },
  precio: {
    type: 'integer',
    minimum: 0,
    maximum: 2147483647,
    example: 19990
  },
  descripcion: textoOpcional(10000),
  imagen: textoOpcional(2000),
  enOferta: {
    type: 'boolean',
    example: false
  },
  descuento: {
    type: 'integer',
    minimum: 0,
    maximum: 100,
    example: 0
  },
  activo: {
    type: 'boolean',
    example: true
  }
};

const esquemas = {
  ProductoCreacion: {
    type: 'object',
    required: [
      'codigo',
      'categoria',
      'nombre',
      'precio'
    ],
    properties: propiedades
  },

  ProductoEdicion: {
    type: 'object',
    minProperties: 1,
    properties: propiedades
  },

  ProductoRespuesta: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        example: 1
      },
      ...propiedades,
      fecha_creacion: {
        type: 'string',
        format: 'date-time'
      },
      fecha_actualizacion: {
        type: 'string',
        format: 'date-time'
      }
    }
  },

  ProductoError: {
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

const parametroId = {
  name: 'id',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 2147483647
  },
  example: 1
};

const cuerpo = nombre => ({
  required: true,
  content: {
    'application/json': {
      schema: referencia(nombre)
    }
  }
});

const listado = {
  type: 'array',
  items: referencia('ProductoRespuesta')
};

const rutas = {
  '/productos': {
    get: {
      tags: ['Productos'],
      summary: 'Listar productos activos',
      security: [],
      responses: {
        200: respuesta('Listado de productos', listado),
        500: error('Error interno del servidor')
      }
    },

    post: {
      tags: ['Productos'],
      summary: 'Crear producto',
      description: 'Operación exclusiva del Administrador.',
      security: seguridad,
      requestBody: cuerpo('ProductoCreacion'),
      responses: {
        201: respuesta(
          'Producto creado correctamente',
          referencia('ProductoRespuesta')
        ),
        400: error('Datos inválidos'),
        401: error('Autenticación requerida'),
        403: error('Permisos insuficientes'),
        409: error('Código de producto duplicado'),
        500: error('Error interno del servidor')
      }
    }
  },

  '/productos/admin': {
    get: {
      tags: ['Productos'],
      summary: 'Listar todos los productos',
      description: 'Incluye productos activos e inactivos.',
      security: seguridad,
      responses: {
        200: respuesta('Listado administrativo', listado),
        401: error('Autenticación requerida'),
        403: error('Permisos insuficientes'),
        500: error('Error interno del servidor')
      }
    }
  },

  '/productos/{id}': {
    parameters: [parametroId],

    get: {
      tags: ['Productos'],
      summary: 'Obtener producto por ID',
      security: [],
      responses: {
        200: respuesta(
          'Producto encontrado',
          referencia('ProductoRespuesta')
        ),
        400: error('ID inválido'),
        404: error('Producto no encontrado o inactivo'),
        500: error('Error interno del servidor')
      }
    },

    patch: {
      tags: ['Productos'],
      summary: 'Modificar o reactivar producto',
      description: 'Operación exclusiva del Administrador.',
      security: seguridad,
      requestBody: cuerpo('ProductoEdicion'),
      responses: {
        200: respuesta(
          'Producto actualizado',
          referencia('ProductoRespuesta')
        ),
        400: error('Datos inválidos'),
        401: error('Autenticación requerida'),
        403: error('Permisos insuficientes'),
        404: error('Producto no encontrado'),
        409: error('Código duplicado'),
        500: error('Error interno del servidor')
      }
    },

    delete: {
      tags: ['Productos'],
      summary: 'Desactivar producto',
      description: 'Eliminación lógica. No elimina el registro.',
      security: seguridad,
      responses: {
        204: respuesta('Producto desactivado'),
        400: error('ID inválido'),
        401: error('Autenticación requerida'),
        403: error('Permisos insuficientes'),
        404: error('Producto no encontrado'),
        500: error('Error interno del servidor')
      }
    }
  }
};

if (!doc.hasIn(['components', 'schemas'])) {
  doc.setIn(['components', 'schemas'], {});
}

for (const [nombre, esquema] of Object.entries(esquemas)) {
  doc.setIn(['components', 'schemas', nombre], esquema);
}

for (const [ruta, contenido] of Object.entries(rutas)) {
  doc.setIn(['paths', prefijo + ruta], contenido);
}

const tags = actual.tags || [];

if (!tags.some(tag => tag.name === 'Productos')) {
  doc.set('tags', [
    ...tags,
    {
      name: 'Productos',
      description: 'Gestión del catálogo de SonidoVivo'
    }
  ]);
}

const salida = doc.toString();

// Verificar que el YAML generado pueda interpretarse.
YAML.parse(salida);

fs.writeFileSync(archivo, salida, 'utf8');

console.log('================================');
console.log('SWAGGER ACTUALIZADO CORRECTAMENTE');
console.log('6 endpoints de productos agregados');
console.log('Documentación existente conservada');
console.log('================================');
