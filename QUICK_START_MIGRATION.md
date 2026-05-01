# 🚀 QUICK START - MULTI-TENANT MIGRATION

## Pasos para ejecutar la migración hardcore

### 1. Configurar Base de Datos

1. **Obtener connection string de Supabase**:
   - Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
   - Settings > Database > Connection string
   - Copia la URL que se ve así: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

2. **Crear archivo de configuración**:
   ```bash
   cp .env.migration.example .env.migration
   ```

3. **Editar `.env.migration`** con tu connection string:
   ```
   DATABASE_URL=postgresql://postgres:tu_password@db.tu_proyecto.supabase.co:5432/postgres
   ```

### 2. Ejecutar Migración

```bash
# Ver estado actual
npm run db:status

# Ejecutar todas las migraciones
npm run db:migrate
```

### 3. Validar Seguridad

```bash
# Validar que todo funciona correctamente
npm run db:validate
```

## 🎯 Resultado Esperado

Si todo sale bien, verás:

```
🎉 MIGRATION COMPLETE!
Your database is now ready with the hardcore multi-tenant architecture!

🔥 BULLETPROOF: All security validations passed!
✅ Zero Trust architecture is properly implemented
✅ Multi-tenant isolation is guaranteed
✅ Ready for production deployment
```

## 🔧 Troubleshooting

### Error: "Cannot connect to database"
- Verifica que el `DATABASE_URL` en `.env.migration` sea correcto
- Asegúrate de que tu IP esté en la whitelist de Supabase
- Verifica que la contraseña sea correcta

### Error: "Migration failed"
- Revisa los logs de error específicos
- Puede que algunas tablas ya existan (esto es normal)
- Ejecuta `npm run db:status` para ver qué migraciones faltan

### Error: "RLS policies failed"
- Esto puede pasar si ya tienes políticas RLS
- Revisa el log específico del error
- Puede ser necesario ajustar las políticas manualmente

## 📋 Verificación Manual

Puedes verificar manualmente en Supabase Dashboard:

1. **Tablas creadas**: Ve a Database > Tables
   - Deberías ver: `organizations`, `organization_members`, etc.

2. **RLS habilitado**: En cada tabla, verifica que "Row Level Security" esté ON

3. **Políticas creadas**: En cada tabla, ve a "Policies" y verifica que existan

4. **Funciones creadas**: Ve a Database > Functions
   - Deberías ver: `get_user_organization_context`, etc.

## 🎉 ¡Listo!

Una vez completado, tu base de datos tendrá:
- ✅ Arquitectura multi-tenant bulletproof
- ✅ Zero Trust security implementado
- ✅ Row Level Security en todas las tablas
- ✅ Funciones de utilidad para Edge Functions
- ✅ Audit trail completo
- ✅ Listo para desarrollo y producción