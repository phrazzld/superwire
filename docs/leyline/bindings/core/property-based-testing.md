---
id: property-based-testing
last_modified: '2025-06-03'
version: '0.2.0'
derived_from: testability
enforced_by: 'testing framework configuration & code review'
---
# Binding: Use Property-Based Testing to Verify System Invariants

Complement example-based tests with property-based tests that verify invariants and relationships hold across entire classes of inputs. Define properties that must always be true and let testing frameworks generate hundreds of test cases automatically to validate these constraints.

## Rationale

This binding implements our testability tenet by dramatically expanding test coverage beyond manually written examples. Property-based testing shifts focus from specific scenarios to fundamental properties and invariants that define correct behavior, uncovering edge cases and boundary conditions that manual tests miss. It automatically explores input spaces systematically, verifying properties across thousands of generated inputs. When properties fail, shrinking algorithms automatically find minimal failing cases, making debugging easier than traditional random testing.

## Rule Definition

This binding establishes guidelines for effective property-based testing:

- **Property Identification**: Use for functions with clear invariants:
  - Mathematical properties (commutativity, associativity, identity, inverse)
  - Data structure invariants (size, ordering, structural constraints)
  - Business rule invariants (constraints independent of specific values)
  - Round-trip properties (encode/decode, serialize/deserialize)

- **Complementary Coverage**: Property tests complement example tests:
  - Example tests verify specific scenarios and known business rules
  - Property tests verify general invariants across broad input ranges
  - Use both approaches for comprehensive critical functionality coverage

- **Property Design**: Write properties that are specific, universal, testable, and independent of implementation details

- **Input Generation**: Design generators that cover edge cases, reflect real usage patterns, scale appropriately, and maintain validity constraints

- **Failure Investigation**: Use shrinking to analyze minimal cases, verify property definitions, fix root causes, and strengthen properties

## Practical Implementation

Concrete strategies for integrating property-based testing:

1. **Start with Mathematical Properties**: Begin with functions having clear mathematical relationships (sorting, arithmetic, data transformations)
2. **Design Effective Generators**: Create realistic, diverse generators that maintain validity constraints and exercise different code paths
3. **Express Business Invariants**: Translate business rules into testable properties ("total equals sum of items plus tax")
4. **Implement Round-trip Testing**: Verify bidirectional operations (serialization/deserialization) are truly reversible
5. **Test State Machine Properties**: Define properties about state transitions and invariants across all states
6. **Balance Performance and Coverage**: Use fewer iterations in development, more in CI; deterministic seeds for debugging

## Examples

```python
# Property-based testing with Hypothesis
from hypothesis import given, strategies as st

# ✅ Sorting invariants
@given(st.lists(st.integers()))
def test_sort_properties(input_list):
    result = sort(input_list)
    assert len(result) == len(input_list)  # Same length
    assert sorted(result) == sorted(input_list)  # Same elements
    assert all(result[i] <= result[i+1] for i in range(len(result)-1))  # Ordered
    assert sort(result) == result  # Idempotent

# ✅ Business invariants
@given(st.lists(st.tuples(st.text(), st.decimals(min_value=0)), min_size=1))
def test_shopping_cart_properties(items):
    cart = ShoppingCart()
    for name, price in items:
        cart.add_item(name, price)

    assert cart.total() == sum(price for name, price in items)  # Total equals sum
    assert cart.item_count() == len(items)  # Count matches items
```

```typescript
// Property-based testing with fast-check
import fc from 'fast-check';

// ✅ Round-trip properties
describe('URL parsing properties', () => {
  it('parsing and formatting are inverse operations', () => {
    fc.assert(fc.property(fc.webUrl(), (url) => {
      const parsed = parseURL(url);
      const formatted = formatURL(parsed);
      const reparsed = parseURL(formatted);
      expect(reparsed).toEqual(parsed);  // Round-trip
    }));
  });
});

// ✅ Data transformation properties
describe('base64 encoding properties', () => {
  it('encoding is reversible', () => {
    fc.assert(fc.property(fc.uint8Array(), (data) => {
      const encoded = base64Encode(data);
      const decoded = base64Decode(encoded);
      expect(decoded).toEqual(data);  // Round-trip
      expect(encoded).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);  // Valid format
    }));
  });
});

// ✅ State machine properties
describe('session state properties', () => {
  it('operations maintain valid state', () => {
    fc.assert(fc.property(
      fc.array(fc.oneof(fc.constant('login'), fc.constant('logout'))),
      (operations) => {
        const session = new UserSession();
        for (const op of operations) {
          if (op === 'login' && !session.isLoggedIn()) session.login('user');
          if (op === 'logout' && session.isLoggedIn()) session.logout();
          // State invariant: isLoggedIn() is always boolean
          expect(typeof session.isLoggedIn()).toBe('boolean');
        }
      }
    ));
  });
```

```java
// Property-based testing with jqwik
import net.jqwik.api.*;

class CollectionPropertiesTest {
    // ✅ Collection invariants
    @Property
    void addingElementIncreasesSize(@ForAll List<Integer> list, @ForAll Integer element) {
        List<Integer> mutableList = new ArrayList<>(list);
        int originalSize = mutableList.size();
        mutableList.add(element);

        assertEquals(originalSize + 1, mutableList.size());  // Size increases
        assertTrue(mutableList.contains(element));  // Element present
    }
}

class OrderPropertiesTest {
    // ✅ Business logic invariants
    @Property
    void orderTotalEqualsItemSum(@ForAll("validOrders") Order order) {
        BigDecimal expectedTotal = order.getItems().stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal actualTotal = order.calculateTotal();
        assertEquals(expectedTotal.add(order.calculateTax()), actualTotal);  // Total = items + tax
    }
}
```

## Related Bindings

- [pure-functions.md](../../docs/bindings/core/pure-functions.md): Pure functions are ideal for property-based testing due to predictable behavior
- [fail-fast-validation.md](../../docs/bindings/core/fail-fast-validation.md): Property tests verify validation logic across wide input ranges
- [no-internal-mocking.md](../../docs/bindings/core/no-internal-mocking.md): Property testing works best with real implementations
