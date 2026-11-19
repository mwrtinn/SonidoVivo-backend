const { z } = require('zod');

exports.actualizarUsuarioDto = z
  .object({
    nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres').optional(),
    rol: z.enum(['Administrador', 'Vendedor', 'Cliente'], { message: 'Rol inválido' }).optional(),
    activo: z.boolean({ message: 'Debe ser verdadero o falso' }).optional()
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Envíe al menos un campo' });