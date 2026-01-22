# Guía de Contribución

¡Gracias por tu interés en contribuir al Sistema de Protección Perimetral Automatizada con Cloudflare! 🎉

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)
- [Pull Requests](#pull-requests)
- [Guías de Estilo](#guías-de-estilo)
- [Estructura del Proyecto](#estructura-del-proyecto)

## 📜 Código de Conducta

Este proyecto adhiere a un código de conducta. Al participar, se espera que mantengas este código. Por favor reporta comportamientos inaceptables.

## 🤝 Cómo Contribuir

### 1. Fork el Repositorio

```bash
# Haz fork desde GitHub, luego clona tu fork
git clone https://github.com/tu-usuario/cloudflare-perimeter-protection.git
cd cloudflare-perimeter-protection
```

### 2. Crea una Rama

```bash
# Crea una rama para tu feature o fix
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/descripcion-del-bug
```

### 3. Realiza tus Cambios

- Escribe código limpio y bien documentado
- Sigue las guías de estilo del proyecto
- Agrega tests si es aplicable
- Actualiza la documentación si es necesario

### 4. Commit tus Cambios

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Formato: <tipo>(<scope>): <descripción>

git commit -m "feat(api): agregar endpoint de métricas"
git commit -m "fix(frontend): corregir validación de formulario"
git commit -m "docs(readme): actualizar guía de instalación"
```

**Tipos de commit:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan el código)
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

### 5. Push a tu Fork

```bash
git push origin feature/nombre-descriptivo
```

### 6. Abre un Pull Request

- Ve a tu fork en GitHub
- Click en "New Pull Request"
- Describe tus cambios detalladamente
- Referencia issues relacionados si aplica

## 🐛 Reportar Bugs

### Antes de Reportar

1. Verifica que no sea un issue duplicado
2. Asegúrate de estar usando la última versión
3. Revisa la documentación y troubleshooting

### Cómo Reportar

Abre un issue con:

**Título:** Descripción breve y clara

**Descripción:**
- Comportamiento esperado
- Comportamiento actual
- Pasos para reproducir
- Screenshots si aplica
- Información del entorno:
  - OS: [Windows/Mac/Linux]
  - Node version: [ej. 18.0.0]
  - Python version: [ej. 3.9.0]
  - Browser: [ej. Chrome 120]

**Ejemplo:**

```markdown
## Bug: Formulario no valida emails correctamente

### Comportamiento Esperado
El formulario debe aceptar emails válidos como user@example.com

### Comportamiento Actual
El formulario rechaza emails válidos con subdominios

### Pasos para Reproducir
1. Ir al formulario de solicitud
2. Ingresar email: user@mail.example.com
3. Click en enviar
4. Ver error de validación

### Entorno
- OS: Windows 11
- Browser: Chrome 120
- Node: 18.0.0
```

## 💡 Sugerir Mejoras

### Antes de Sugerir

1. Verifica que no exista una sugerencia similar
2. Asegúrate de que la mejora sea relevante al proyecto

### Cómo Sugerir

Abre un issue con:

**Título:** [Feature Request] Descripción breve

**Descripción:**
- Problema que resuelve
- Solución propuesta
- Alternativas consideradas
- Impacto esperado

## 🔀 Pull Requests

### Checklist

Antes de enviar tu PR, verifica:

- [ ] El código sigue las guías de estilo
- [ ] Los tests pasan (`npm run test` si aplica)
- [ ] El linter no muestra errores (`npm run lint`)
- [ ] TypeScript compila sin errores (`npm run typecheck`)
- [ ] La documentación está actualizada
- [ ] Los commits siguen Conventional Commits
- [ ] El PR tiene una descripción clara

### Proceso de Revisión

1. Un maintainer revisará tu PR
2. Pueden solicitar cambios
3. Realiza los cambios solicitados
4. Una vez aprobado, se hará merge

## 📝 Guías de Estilo

### TypeScript/JavaScript

```typescript
// ✅ Bueno
interface User {
  id: string;
  name: string;
  email: string;
}

function getUserById(id: string): User | null {
  // Implementación
}

// ❌ Malo
function getUser(id) {
  // Sin tipos
}
```

**Reglas:**
- Usar tipos explícitos
- Nombres descriptivos en camelCase
- Interfaces en PascalCase
- Constantes en UPPER_SNAKE_CASE
- Funciones puras cuando sea posible
- Evitar `any`, usar `unknown` si es necesario

### Python

```python
# ✅ Bueno
def validate_domain(domain: str) -> bool:
    """
    Valida que un dominio tenga formato DNS válido.
    
    Args:
        domain: Dominio a validar
    
    Returns:
        True si es válido, False si no
    """
    pattern = r"^(?=.{1,253}$)..."
    return bool(re.match(pattern, domain))

# ❌ Malo
def validate(d):
    # Sin tipos ni documentación
    return bool(re.match(r"...", d))
```

**Reglas:**
- Seguir PEP 8
- Type hints en funciones
- Docstrings en funciones públicas
- Nombres en snake_case
- Constantes en UPPER_SNAKE_CASE
- Máximo 88 caracteres por línea (Black formatter)

### CSS/Tailwind

```tsx
// ✅ Bueno - Clases organizadas
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-gray-900">Título</h2>
</div>

// ❌ Malo - Clases desordenadas
<div className="p-6 shadow-md flex bg-white gap-4 rounded-lg flex-col">
```

**Orden de clases Tailwind:**
1. Layout (flex, grid, block)
2. Spacing (p-, m-, gap-)
3. Sizing (w-, h-)
4. Typography (text-, font-)
5. Colors (bg-, text-, border-)
6. Effects (shadow-, opacity-)

### Commits

```bash
# ✅ Bueno
feat(api): agregar endpoint de métricas de protección
fix(frontend): corregir validación de email en formulario
docs(readme): actualizar guía de instalación

# ❌ Malo
update stuff
fix bug
changes
```

## 🏗️ Estructura del Proyecto

```
cloudflare-perimeter-protection/
├── api/              # Backend APIs
├── src/              # Frontend React
├── scripts/          # Scripts de utilidad
├── docs/             # Documentación
└── tests/            # Tests (futuro)
```

### Agregar Nuevas APIs

1. Crear archivo en `/api/nombre-api.py`
2. Usar `api/config.py` para configuración
3. Usar `api/utils.py` para utilidades
4. Actualizar `vercel.json` con la ruta
5. Documentar en README.md

### Agregar Nuevos Componentes

1. Crear archivo en `/src/components/NombreComponente.tsx`
2. Usar TypeScript con tipos explícitos
3. Usar Tailwind CSS para estilos
4. Documentar props con JSDoc
5. Exportar desde el archivo

## 🧪 Testing

```bash
# Ejecutar linter
npm run lint

# Verificar tipos TypeScript
npm run typecheck

# Verificar protecciones (Python)
npm run verify
```

## 📚 Recursos

- [Documentación de Cloudflare API](https://developers.cloudflare.com/api/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ❓ Preguntas

Si tienes preguntas:

1. Revisa la documentación en `/docs`
2. Busca en issues existentes
3. Abre un nuevo issue con la etiqueta `question`

## 🙏 Agradecimientos

¡Gracias por contribuir! Cada contribución, grande o pequeña, es valiosa para el proyecto.

---

**Happy Coding! 🚀**
