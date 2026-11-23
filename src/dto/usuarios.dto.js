const { z } = require('zod');

const ROLES = ['Administrador', 'Vendedor', 'Cliente'];

exports.listarUsuariosQueryDto = z.object({
  rol: z.enum(ROLES, { message: 'Rol inválido' }).optional(),
  activo: z
    .enum(['true', 'false'], { message: 'Debe ser true o false' })
    .transform((v) => v === 'true')
    .optional(),
  buscar: z.string().trim().min(1, 'No puede estar vacío').max(100, 'Máximo 100 caracteres').optional()
});

exports.actualizarUsuarioDto = z
  .object({
    nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres').optional(),
    rol: z.enum(ROLES, { message: 'Rol inválido' }).optional(),
    activo: z.boolean({ message: 'Debe ser verdadero o falso' }).optional()
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envíe al menos un campo' });
