---
id: normalized-data-design
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: dry-dont-repeat-yourself
enforced_by: 'Database design review, schema validation, data modeling tools'
---
# Binding: Design Normalized Data Structures

Structure data to eliminate redundancy and ensure that each piece of information is stored in exactly one place. This creates a single source of truth for each data element and prevents inconsistencies that arise from duplicated information.

## Rationale

This binding implements our DRY tenet at the data layer by ensuring that knowledge represented in data exists in only one location. When the same information is stored in multiple places—whether in database tables, object properties, or data structures—you create maintenance challenges and opportunities for data inconsistency that can corrupt your system's integrity. Denormalized data creates a maintenance nightmare where the same fact must be updated in multiple locations, creating opportunities for inconsistency that leads to bugs, incorrect business decisions, and user frustration.

## Rule Definition

**Core Requirements:**

- **Single Source of Truth**: Each distinct piece of information should be stored in exactly one location and referenced from all other locations that need it

- **Eliminate Redundant Storage**: Avoid storing the same information in multiple places unless there's a compelling performance or business requirement that justifies the duplication

- **Use Foreign Keys and References**: Establish relationships between data entities through keys and references rather than duplicating related information across entities

- **Separate Concerns by Entity Type**: Organize data according to the distinct entities and concepts in your domain, ensuring that each entity's data is managed independently

- **Maintain Referential Integrity**: Implement constraints and validation that ensure references between data entities remain valid and consistent

**Normalization Levels:** First Normal Form (1NF) - eliminate repeating groups and ensure atomic values; Second Normal Form (2NF) - eliminate partial dependencies on composite keys; Third Normal Form (3NF) - eliminate transitive dependencies between non-key attributes; Higher Normal Forms - apply Boyce-Codd Normal Form (BCNF) and beyond for complex scenarios

**Controlled Denormalization:** Performance optimization based on measured bottlenecks, read-heavy scenarios where query performance is critical, derived values that are expensive to calculate - always with explicit justification and maintenance strategies

## Practical Implementation

1. **Identify Domain Entities**: Analyze your business domain to identify distinct entities and their relationships. Each entity should represent a single concept with its own lifecycle and responsibilities.

2. **Apply Normalization Systematically**: Work through normalization forms methodically, ensuring that each level is properly implemented before moving to the next.

3. **Use Consistent Referencing Patterns**: Establish standard patterns for how entities reference each other, using primary keys, foreign keys, and junction tables consistently across your schema.

4. **Implement Data Integrity Constraints**: Use database constraints, application-level validation, and business rules to maintain referential integrity and prevent data corruption.

5. **Design for Query Patterns**: While maintaining normalization, consider how your data will be queried and accessed to ensure that normalized structures support efficient data retrieval.

## Examples

**Database Normalization:**
```sql
-- ❌ BAD: Denormalized with redundancy
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100),    -- Duplicated data
    customer_email VARCHAR(100),   -- Duplicated data
    product_name VARCHAR(100),     -- Duplicated data
    product_description TEXT,      -- Duplicated data
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    order_date TIMESTAMP
);

-- ✅ GOOD: Normalized design
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);
```

**Application-Level Normalization:**
```typescript
// Normalized interfaces with references
interface Customer { id: string; name: string; email: string; }
interface Product { id: string; name: string; price: number; }
interface Order { id: string; customerId: string; orderDate: Date; }
interface OrderItem { id: string; orderId: string; productId: string; quantity: number; }

class NormalizedDataManager {
  constructor(
    private customers: Map<string, Customer>,
    private products: Map<string, Product>,
    private orders: Map<string, Order>,
    private orderItems: Map<string, OrderItem[]>
  ) {}

  // Denormalize for presentation when needed
  getOrderDetails(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) return null;

    const customer = this.customers.get(order.customerId);
    const items = this.orderItems.get(orderId) || [];
    const itemsWithDetails = items.map(item => ({
      ...item,
      product: this.products.get(item.productId)
    }));

    return { order, customer, items: itemsWithDetails };
  }

  // Update once - affects all references
  updateCustomer(customerId: string, updates: Partial<Customer>): void {
    const customer = this.customers.get(customerId);
    if (!customer) throw new Error('Customer not found');
    this.customers.set(customerId, { ...customer, ...updates });
  }
}
```

## Related Bindings

- [centralized-configuration](../../docs/bindings/core/centralized-configuration.md): Eliminates settings duplication
- [extract-common-logic](../../docs/bindings/core/extract-common-logic.md): Avoids data duplication across system layers
- [interface-contracts](../../docs/bindings/core/interface-contracts.md): Defines data relationship contracts
- [component-isolation](../../docs/bindings/core/component-isolation.md): Ensures clear entity boundaries
