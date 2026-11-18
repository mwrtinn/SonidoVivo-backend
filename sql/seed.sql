INSERT INTO roles (nombre, descripcion) VALUES
  ('Administrador', 'Gestiona usuarios, roles, catálogo y pedidos'),
  ('Vendedor', 'Gestiona catálogo y estados de pedidos'),
  ('Cliente', 'Compra y consulta solo sus propios pedidos')
ON CONFLICT (nombre) DO NOTHING;