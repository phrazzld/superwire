---
derived_from: simplicity
enforced_by: dependency scanners & code review
id: dependency-management
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Minimize and Maintain Dependencies Deliberately

Choose third-party dependencies deliberately, preferring minimal solutions that solve
specific problems. Actively manage the entire dependency lifecycle, from initial
evaluation through regular updates and security audits, treating each dependency as a
long-term commitment rather than a quick solution.

## Rationale

This binding implements our simplicity tenet by addressing a major source of hidden
complexity: the sprawling dependency trees that frequently grow beneath the surface of
modern applications. When you add a dependency to your project, you're not just adding a
single package—you're adopting an entire tree of transitive dependencies, each with its
own APIs, behaviors, bugs, and security vulnerabilities that now become your
responsibility to understand and maintain.

Each dependency brings its own transitive dependency tree, security vulnerabilities, and maintenance burden. Without deliberate management, dependency trees quickly become unmanageable, making security issues difficult to detect and expensive to fix.

This binding supports our automation tenet by emphasizing automated dependency management. Automated updates, security scanning, and compliance checks ensure consistent best practices at scale, catching issues before they impact production systems.

## Rule Definition

This binding establishes principles for thoughtful dependency management throughout the
software lifecycle:

- **Evaluation**: Before adding any dependency:
  - Verify in-house implementation would be more complex
  - Evaluate maintenance status, security history, and community health
  - Assess transitive dependency impact and licensing implications

- **Minimization**: When using dependencies:
  - Choose focused solutions that solve specific problems
  - Prefer mature libraries with minimal dependency trees
  - Isolate dependencies behind clear architectural boundaries
  - Import only needed functionality, not entire frameworks

- **Maintenance**: Throughout project lifetime:
  - Automate security monitoring and compatible updates
  - Maintain accurate dependency inventory with clear purposes
  - Establish processes for evaluating and testing updates

- **Permitted Exceptions**: The following exceptions are allowed:

  - Core platform dependencies (language runtimes, standard libraries)
  - Organization-wide approved frameworks designated as "sanctioned"
  - Critical specialized functionality where the cost of implementation would be
    prohibitive
  - Legacy dependencies with plans for replacement or isolation

When implementing these exceptions, you must document the justification, scope the usage
as narrowly as possible, and establish a plan for any necessary refactoring toward more
maintainable alternatives.

## Practical Implementation

1. **Dependency Evaluation Process**: Establish evaluation criteria before adding dependencies:

   ```typescript
   // Dependency evaluation checklist template
   /**
    * Package: <package-name>
    * Purpose: <justification>
    *
    * - [ ] Solves specific, immediate need
    * - [ ] Would require >100 LOC to implement ourselves
    * - [ ] Active maintenance and security history
    * - [ ] Well-documented API with compatible license
    * - [ ] Minimal transitive dependencies (<10)
    */
   ```

2. **Automated Dependency Management**: Configure automation for security and updates:

   ```typescript
   // Example package.json with automated dependency management
   {
     "scripts": {
       "audit": "npm audit --audit-level moderate",
       "update-check": "npm outdated",
       "security-scan": "npm audit --parseable | npm-audit-ci-wrapper"
     },
     "dependencies": {
       "express": "^4.18.0",  // Use caret ranges for compatible updates
       "lodash": "^4.17.21"   // Pin major versions to avoid breaking changes
     }
   }
   ```

3. **Architectural Boundaries**: Isolate dependencies behind clear interfaces:

   ```typescript
   // ❌ BAD: Direct third-party dependency usage
   import { Parser } from 'third-party-parser';

   function processData(data: string) {
     return new Parser().parse(data);  // Exposes third-party types
   }

   // ✅ GOOD: Dependency isolation with adapter pattern
   interface DataParser {
     parse(data: string): Document;
   }

   class ThirdPartyAdapter implements DataParser {
     private parser = new Parser();

     parse(data: string): Document {
       const result = this.parser.parse(data);
       return this.convertToDocument(result);
     }
   }

   function processData(parser: DataParser, data: string) {
     return parser.parse(data);  // Only depends on our interface
   }
   ```

4. **Dependency Auditing**: Maintain inventory and regular audits:

   ```typescript
   // Package.json with audit scripts
   {
     "scripts": {
       "audit": "npm audit",
       "outdated": "npm outdated",
       "unused": "npx depcheck",
       "sbom": "npx @cyclonedx/cyclonedx-npm --output-file sbom.json"
     }
   }
   ```

5. **Dependency Pruning**: Regularly replace heavy dependencies with lighter alternatives:

   ```typescript
   // ❌ BAD: Heavy library for simple operations
   import * as moment from 'moment';  // ~300KB bundle impact

   function formatDate(date: Date): string {
     return moment(date).format('YYYY-MM-DD');
   }

   // ✅ GOOD: Native functionality or focused alternatives
   function formatDate(date: Date): string {
     return date.toISOString().split('T')[0];  // No dependencies
   }

   // Or with focused library when needed
   import { format } from 'date-fns';  // Tree-shakable, ~6KB
   function formatDate(date: Date): string {
     return format(date, 'yyyy-MM-dd');
   }
   ```

## Examples

```typescript
// ❌ BAD: Excessive dependencies for simple functionality
{
  "dependencies": {
    "left-pad": "^1.3.0",      // String padding
    "is-odd": "^3.0.1",        // Number parity check
    "array-unique": "^0.3.2",  // Remove duplicates
    "lodash": "^4.17.21"       // Utility functions
  }
}

const leftPad = require('left-pad');
const isOdd = require('is-odd');
const _ = require('lodash');

function processValues(values: number[]): string[] {
  const oddNumbers = values.filter(v => isOdd(v));
  const uniqueOddNumbers = _.uniq(oddNumbers);
  return uniqueOddNumbers.map(n => leftPad(n.toString(), 5, '0'));
}

// ✅ GOOD: Native functionality eliminates dependencies
function processValues(values: number[]): string[] {
  const oddNumbers = values.filter(n => n % 2 !== 0);
  const uniqueOddNumbers = [...new Set(oddNumbers)];
  return uniqueOddNumbers.map(n => n.toString().padStart(5, '0'));
}
```

```typescript
// ❌ BAD: Mixing multiple libraries for same functionality
import moment from 'moment';
import { parseISO } from 'date-fns';
import dayjs from 'dayjs';

class DateService {
  formatDate(date: string): string {
    return moment(date).format('YYYY-MM-DD');     // Inconsistent approaches
  }

  parseDate(dateStr: string): Date {
    return parseISO(dateStr);                     // Multiple date libraries
  }
}

// ✅ GOOD: Single focused dependency with clear boundaries
import { format, parseISO } from 'date-fns';

interface DateFormatter {
  format(date: Date, pattern: string): string;
  parse(dateStr: string): Date;
}

class DateFnsAdapter implements DateFormatter {
  format(date: Date, pattern: string): string {
    return format(date, pattern);
  }

  parse(dateStr: string): Date {
    return parseISO(dateStr);
  }
}

class DateService {
  constructor(private formatter: DateFormatter) {}

  formatDate(date: Date): string {
    return this.formatter.format(date, 'yyyy-MM-dd');
  }
}
```

## Related Bindings

- [simplicity](../../docs/tenets/simplicity.md): Direct application of "minimize moving parts." Each dependency adds complexity to understand, maintain, and debug.

- [external-configuration](../../docs/bindings/core/external-configuration.md): Both isolate change-prone aspects—configuration and third-party code—behind clear boundaries for easier adaptation.

- [no-secret-suppression](../../docs/tenets/no-secret-suppression.md): Unpatched dependencies are common security risks. Accurate inventory and automated scanning detect vulnerabilities early.

- [hex-domain-purity](../../docs/bindings/core/hex-domain-purity.md): Isolating dependencies at boundaries keeps domain logic pure and makes replacement easier without disrupting core functionality.
