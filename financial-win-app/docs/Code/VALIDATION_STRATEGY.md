# Estrategia de Validación

## Principio Fundamental

**Zod es el single source of truth para validación en todo el proyecto.**

Todos los esquemas de validación se definen usando Zod, y los tipos TypeScript se generan automáticamente desde estos esquemas.

## Arquitectura

```
packages/shared-types/
  └── src/dto/
      └── *.schema.ts        # Schemas Zod (single source of truth)

packages/shared-config/
  └── src/validation/
      └── zod-validation.pipe.ts  # Adaptador para NestJS
```

## Cómo Crear un Nuevo Schema

### 1. Definir Schema Zod

Crea el schema en `packages/shared-types/src/dto/`:

```typescript
// packages/shared-types/src/dto/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  age: z.number().int().min(18).max(120).optional(),
});

// Exportar tipo inferido
export type CreateUser = z.infer<typeof createUserSchema>;
```

### 2. Exportar desde index

```typescript
// packages/shared-types/src/dto/index.ts
export * from './user.schema';
```

### 3. Usar en Backend (NestJS)

#### Opción A: Usar ZodValidationPipe

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '@financial-win/shared-config';
import { createUserSchema, CreateUser } from '@financial-win/shared-types';

@Controller('users')
export class UsersController {
  @Post()
  @UsePipes(new ZodValidationPipe(createUserSchema))
  create(@Body() data: CreateUser) {
    // data está validado y tipado
    return this.usersService.create(data);
  }
}
```

#### Opción B: Validar manualmente en Service

```typescript
import { validate } from '@financial-win/shared-config';
import { createUserSchema, CreateUser } from '@financial-win/shared-types';

@Injectable()
export class UsersService {
  create(data: unknown): Promise<User> {
    // Validar y obtener tipo
    const validatedData = validate(createUserSchema, data);
    // validatedData es de tipo CreateUser
    return this.repository.save(validatedData);
  }
}
```

### 4. Usar en Frontend

```typescript
import { createUserSchema, CreateUser } from '@financial-win/shared-types';
import { safeValidate } from '@financial-win/shared-config';

function UserForm() {
  const handleSubmit = (formData: FormData) => {
    const data = Object.fromEntries(formData);
    
    // Validar antes de enviar
    const result = safeValidate(createUserSchema, data);
    
    if (!result.success) {
      // Mostrar errores de validación
      console.error(result.error.errors);
      return;
    }
    
    // result.data es de tipo CreateUser y está validado
    apiClient.post('/users', result.data);
  };
}
```

## Ventajas de Esta Estrategia

1. **Single Source of Truth**: Un solo lugar para definir validación
2. **Type Safety**: Tipos TypeScript generados automáticamente
3. **Consistencia**: Misma validación en backend y frontend
4. **Reutilización**: Schemas compartidos entre apps
5. **Mantenibilidad**: Cambios en un solo lugar se reflejan en todos lados

## Cuándo Usar class-validator

**Solo usar class-validator cuando:**
- Necesites integración específica con decoradores de NestJS que no se pueden lograr con Zod
- Tengas código legacy que ya usa class-validator y la migración no es inmediata
- Necesites validaciones muy específicas de NestJS que Zod no soporta

**En estos casos:**
- Mantén el schema Zod como fuente de verdad
- Crea DTOs de class-validator que reflejen el schema Zod
- Documenta por qué se usa class-validator en ese caso específico

## Migración de DTOs Existentes

Para migrar un DTO existente de class-validator a Zod:

1. **Crear schema Zod** en `packages/shared-types/src/dto/`
2. **Generar tipos** desde el schema
3. **Actualizar controller** para usar `ZodValidationPipe`
4. **Mantener DTO de class-validator temporalmente** si hay dependencias
5. **Eliminar DTO de class-validator** una vez migrado completamente

## Ejemplo Completo

Ver `packages/shared-types/src/dto/storage-analytics.schema.ts` para un ejemplo completo de migración de DTOs a schemas Zod.

## Best Practices

1. **Siempre exportar tipos** desde schemas: `export type X = z.infer<typeof xSchema>`
2. **Usar nombres descriptivos**: `createUserSchema`, `updateUserSchema`
3. **Componer schemas**: Usar `.extend()`, `.pick()`, `.omit()` para reutilizar
4. **Validar temprano**: Validar en el controller, no solo en el service
5. **Mensajes de error claros**: Usar `.refine()` para mensajes personalizados cuando sea necesario

