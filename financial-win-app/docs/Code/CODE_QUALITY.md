# Configuración de Calidad de Código

Este documento describe la configuración de Prettier, ESLint y Husky para mantener calidad de código consistente.

## Prettier

### Configuración

- **Archivo**: `.prettierrc.json` (raíz del proyecto)
- **Uso**: Formatea código automáticamente antes de commits
- **Integración**: Leído automáticamente por ESLint y lint-staged

### Características

- ✅ Configuración unificada en un solo archivo
- ✅ Ambos proyectos (api y web) usan la misma configuración
- ✅ ESLint lee automáticamente de `.prettierrc.json`
- ✅ `.prettierignore` excluye archivos generados y dependencias

### Configuración Actual

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "auto",
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "quoteProps": "as-needed"
}
```

## ESLint

### Configuración

- **Backend**: `apps/api/eslint.config.js`
- **Frontend**: `apps/web/eslint.config.js`
- **Integración**: Usa `eslint-config-prettier` para evitar conflictos

### Características

- ✅ Integración con Prettier (sin conflictos)
- ✅ Reglas TypeScript estrictas
- ✅ Detección de imports/variables no usadas
- ✅ Reglas específicas para tests y scripts
- ✅ Configuración relajada para migraciones

### Reglas Principales

**Backend (API):**
- `@typescript-eslint/no-unused-vars`: Error (variables no usadas)
- `unused-imports/no-unused-imports`: Error (imports no usados)
- `prettier/prettier`: Error (formato Prettier)
- `@typescript-eslint/no-explicit-any`: Warning

**Frontend (Web):**
- `@typescript-eslint/no-unused-vars`: Warning
- `unused-imports/no-unused-imports`: Error
- `react-hooks/rules-of-hooks`: Error
- `prettier/prettier`: Error (formato Prettier)
- `@typescript-eslint/no-explicit-any`: Warning

## Integración con Husky

### Flujo de Validación

```
git commit
    ↓
Pre-commit Hook
    ↓
lint-staged ejecuta:
  1. Prettier (formatea)
  2. ESLint --fix (corrige errores)
    ↓
TypeCheck (si hay archivos TS)
    ↓
Commit-msg Hook
    ↓
Valida formato Conventional Commits
    ↓
✅ Commit completado
```

### Archivos Procesados

**lint-staged** (`.lintstagedrc.json`):
- `apps/web/src/**/*.{ts,tsx}` → Prettier + ESLint
- `apps/api/src/**/*.{ts,js}` → Prettier + ESLint
- `*.{json,md,yml,yaml}` → Prettier

## Mejores Prácticas

### 1. Configuración Unificada

✅ **Correcto**: Un solo `.prettierrc.json` en la raíz  
❌ **Incorrecto**: Múltiples configuraciones de Prettier

### 2. Integración ESLint-Prettier

✅ **Correcto**: `eslint-config-prettier` desactiva reglas conflictivas  
✅ **Correcto**: `prettier/prettier` lee de `.prettierrc.json`  
❌ **Incorrecto**: Duplicar configuración de Prettier en ESLint

### 3. Archivos Ignorados

✅ **Correcto**: `.prettierignore` y ESLint `ignores` deben estar sincronizados  
✅ **Correcto**: Ignorar `dist/`, `node_modules/`, archivos generados

## Troubleshooting

### Prettier y ESLint están en conflicto

**Solución**: Asegúrate de que ambos proyectos usen:
- `eslint-config-prettier` (desactiva reglas conflictivas)
- `prettier/prettier` con solo `endOfLine: 'auto'` (lee del `.prettierrc.json`)

### Los hooks son muy lentos

**Solución**: 
- lint-staged solo procesa archivos modificados
- TypeCheck solo se ejecuta si hay archivos TS modificados
- Considera hacer commits más pequeños y frecuentes

### Errores de formato que no se corrigen

**Solución**:
1. Ejecuta manualmente: `pnpm format`
2. Ejecuta manualmente: `pnpm lint`
3. Si persisten, revisa `.prettierignore` y ESLint `ignores`

## Comandos Útiles

```bash
# Formatear todo el código
pnpm format

# Verificar formato sin cambiar
pnpm format:check

# Ejecutar ESLint y corregir
pnpm lint

# Verificar tipos TypeScript
pnpm --filter web exec tsc --noEmit
pnpm --filter api exec tsc --noEmit
```

## Estado Actual

✅ **Prettier**: Configuración unificada y robusta  
✅ **ESLint**: Integrado correctamente con Prettier  
✅ **Husky**: Hooks configurados y funcionando  
✅ **lint-staged**: Procesa solo archivos modificados  
✅ **TypeCheck**: Integrado en pre-commit hook

**Conclusión**: La configuración es robusta y lista para producción. ✅

