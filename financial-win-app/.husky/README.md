# Git Hooks con Husky

Este proyecto utiliza Husky para ejecutar validaciones automáticas antes de commits y pushes.

## Hooks Configurados

### Pre-commit Hook (`.husky/pre-commit`)

Se ejecuta automáticamente antes de cada commit y realiza:

1. **Prettier**: Formatea código automáticamente
2. **ESLint**: Detecta y corrige errores de linting
3. **TypeCheck**: Verifica tipos TypeScript (solo si hay archivos TS modificados)

**Qué hace:**
- Formatea código con Prettier
- Ejecuta ESLint y corrige errores automáticamente
- Verifica tipos TypeScript en el frontend
- Bloquea el commit si hay errores que no se pueden corregir automáticamente

**Cómo funciona:**
```bash
git commit -m "feat: nueva funcionalidad"
# → Prettier formatea archivos
# → ESLint corrige errores automáticamente
# → TypeCheck verifica tipos
# → Commit se completa solo si todo pasa
```

### Commit-msg Hook (`.husky/commit-msg`)

⚠️ **Deshabilitado**: La validación de formato de commits está deshabilitada para permitir flexibilidad durante el desarrollo.

**Nota**: Aunque no hay restricciones automáticas, se recomienda usar mensajes de commit descriptivos y claros para facilitar el mantenimiento del historial.

## Configuración

### lint-staged (`.lintstagedrc.json`)

Define qué comandos ejecutar en archivos modificados:

- **TypeScript/TSX**: Prettier + ESLint
- **JSON/MD/YAML**: Solo Prettier

## Troubleshooting

### El hook bloquea mi commit

Si el hook falla:

1. **Revisa los errores** mostrados en la consola
2. **Corrige los errores** manualmente si ESLint no pudo corregirlos
3. **Vuelve a agregar** los archivos: `git add .`
4. **Intenta el commit** nuevamente

### Quiero saltar los hooks (NO recomendado)

```bash
# Solo en casos excepcionales
git commit --no-verify -m "mensaje"
```

⚠️ **Advertencia**: Saltar hooks puede introducir código con errores al repositorio.

### Los hooks son muy lentos

Los hooks están optimizados para ejecutarse solo en archivos modificados. Si aún así son lentos:

1. Verifica que solo estás haciendo commit de archivos necesarios
2. Considera hacer commits más pequeños y frecuentes
3. El TypeCheck solo se ejecuta si hay archivos TypeScript modificados

## Personalización

### Deshabilitar TypeCheck en pre-commit

Edita `.husky/pre-commit` y comenta la sección de TypeCheck:

```bash
# Paso 2: TypeCheck del frontend (comentado)
# if git diff --cached --name-only --diff-filter=ACM | grep -qE '\.(ts|tsx)$'; then
#   ...
# fi
```

### Habilitar validación de formato de commits (opcional)

Si deseas volver a habilitar la validación de formato Conventional Commits, puedes crear un nuevo archivo `.husky/commit-msg` con las reglas de validación deseadas.

## Beneficios

✅ **Código consistente**: Prettier asegura formato uniforme  
✅ **Menos errores**: ESLint detecta problemas antes del commit  
✅ **Tipos seguros**: TypeCheck previene errores de tipos  
✅ **Flexibilidad**: Sin restricciones estrictas en mensajes de commit  
✅ **Menos conflictos**: Código formateado reduce conflictos de merge

