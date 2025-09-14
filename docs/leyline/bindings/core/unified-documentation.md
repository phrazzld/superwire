---
id: unified-documentation
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: dry-dont-repeat-yourself
enforced_by: 'Documentation tools, content review, automated generation'
---
# Binding: Maintain Single Source Documentation

Create a unified documentation system where each piece of knowledge is documented once in an authoritative location and referenced from all other locations that need it. This eliminates documentation duplication, inconsistencies, and maintenance overhead.

## Rationale

This binding implements our DRY tenet by ensuring knowledge exists in exactly one authoritative place. Duplicated documentation across README files, API docs, and code comments creates maintenance nightmares where updates must be applied everywhere or documentation becomes inconsistent and unreliable.

## Rule Definition

**Core Requirements:**

- **Single Authoritative Source**: Each piece of knowledge documented once in a canonical location with all other references linking to it
- **Generated Documentation**: Generate docs from authoritative sources (code, schemas, configs) rather than maintaining separate docs
- **Reference-Based Linking**: Use links and includes rather than copying content to ensure updates propagate automatically
- **Hierarchical Organization**: Clear hierarchy with consistent categorization for finding canonical information
- **Version Control**: Track documentation changes with version history for traceability

**Implementation:** Documentation-as-code, API docs from code annotations, centralized decision logs, content management with proper linking

## Practical Implementation

1. **Generate from Single Sources**: Auto-generate docs from code, schemas, or configs to maintain synchronization
2. **Implement Content Includes**: Use systems supporting content inclusion to write once, include everywhere
3. **Create Cross-Reference Systems**: Build comprehensive linking between docs without content duplication
4. **Establish Documentation Ownership**: Assign clear ownership for each area to ensure currency
5. **Use Living Documentation**: Auto-update docs when underlying systems change

## Examples

```typescript
// ❌ BAD: Documentation duplicated across README.md, api-docs.md, code comments
// Each location contains different/conflicting API information

// ✅ GOOD: Single source of truth with generated documentation
// schema/user.schema.ts - Authoritative definition
import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(2).max(50).describe('User full name'),
  email: z.string().email().describe('User email address (login)'),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/)
    .describe('Password meeting security requirements')
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

// API implementation uses schema
class UserController {
  async createUser(req: Request, res: Response) {
    try {
      const userData = CreateUserSchema.parse(req.body);
      const user = await this.userService.createUser(userData);
      res.status(201).json({ userId: user.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
    }
  }
}

// OpenAPI generated from schema
import { generateSchema } from '@anatine/zod-openapi';

export const openApiSpec = {
  paths: {
    '/api/users': {
      post: {
        summary: 'Create user account',
        requestBody: {
          content: {
            'application/json': {
              schema: generateSchema(CreateUserSchema)  // Generated from single source
            }
          }
        }
      }
    }
  }
};

// README.md references authoritative source
/**
 * # User API
 *
 * **Validation:** All rules defined in `schema/user.schema.ts`
 * **Documentation:** Generated docs at `/api-docs`
 * **Schema:** See schema file for current requirements
 */
```

```python
# Configuration with generated documentation
@dataclass
class ConfigurationSchema:
    """Single source of truth for configuration"""

    database_url: str = field(
        metadata={
            'env_var': 'DATABASE_URL',
            'description': 'PostgreSQL connection string',
            'required': True
        }
    )

    redis_url: str = field(
        metadata={
            'env_var': 'REDIS_URL',
            'description': 'Redis connection for caching',
            'required': True
        }
    )

# Documentation generation
class ConfigDocGenerator:
    @staticmethod
    def generate_env_table() -> str:
        """Generate markdown table from schema metadata"""
        table = "| Variable | Description | Required |\n"
        table += "|----------|-------------|----------|\n"

        for field in fields(ConfigurationSchema):
            metadata = field.metadata
            env_var = metadata.get('env_var')
            description = metadata.get('description')
            required = 'Yes' if metadata.get('required') else 'No'
            table += f"| `{env_var}` | {description} | {required} |\n"

        return table

# Auto-generated docs reference single source
# docs/configuration.md:
# "Generated from config/schema.py - DO NOT EDIT MANUALLY"
# README.md:
# "See config/schema.py for complete configuration reference"
```
```

## Related Bindings

- [centralized-configuration.md](../../docs/bindings/core/centralized-configuration.md): Eliminates settings duplication; unified docs eliminates knowledge duplication
- [api-design.md](../../docs/bindings/core/api-design.md): API docs should be generated from schemas to maintain synchronization
- [automated-quality-gates.md](../../docs/bindings/core/automated-quality-gates.md): Quality gates enforce doc standards and generation validation
- [extract-common-logic.md](../../docs/bindings/core/extract-common-logic.md): Extract and reuse documentation patterns
