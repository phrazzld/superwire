---
id: debugger-first-development
last_modified: '2025-06-17'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'code review, team standards, debugging documentation'
---

# Binding: Use Debuggers as Primary Debugging Tool

Reach for the debugger before print statements when investigating bugs or understanding code behavior. Normalize debugger use in team culture and invest time in learning platform-specific debugging capabilities. Proper debuggers provide more information with less code pollution than print debugging.

## Rationale

Grug observes that many developers default to print statements (console.log, printf, etc.) for debugging because debuggers feel intimidating or complex. This creates a vicious cycle: avoiding debuggers keeps them unfamiliar, which reinforces the preference for print debugging. Meanwhile, print statements accumulate in codebases, provide limited context, and require constant modification and cleanup.

The resistance to debuggers often stems from early programming education that emphasizes print debugging, lack of proper debugger setup in development environments, or bad experiences with poorly configured debugging tools. However, once developers experience the power of interactive debugging—stepping through code, inspecting complex state, and modifying variables in real-time—they rarely want to return to print debugging.

Debuggers provide several advantages: they show the complete execution context, allow real-time state modification, enable conditional inspection without code changes, and leave no artifacts in the codebase. The time investment in debugger mastery pays compound returns through faster bug resolution and deeper code comprehension.

## Rule Definition

**MUST** attempt to use a debugger before adding print statements for bug investigation.

**MUST** remove debugging artifacts (print statements, temporary variables) before committing code.

**SHOULD** set up proper debugging configuration for local development environment.

**SHOULD** document team-specific debugging workflows and configurations.

**SHOULD** use debugger features (conditional breakpoints, watch expressions) rather than code modifications.

## Why Debuggers Are Underutilized

### Common Barriers and Solutions

**❌ "Setup is too complex"** → ✅ Invest 2-3 hours in initial configuration
**❌ "Print statements are faster"** → ✅ Practice debugger workflows until reflexive
**❌ "Don't work with complex systems"** → ✅ Learn remote and container debugging
**❌ "Don't understand the output"** → ✅ Start simple, gradually increase complexity

### Cultural Reinforcement

**Normalize debugger use in code reviews:**
```
// Instead of accepting this:
console.log('user data:', user);
console.log('validation result:', isValid);

// Ask: "Could this investigation have been done with the debugger?"
// Suggest: "Let's pair on the debugger workflow for this type of issue"
```

**Share debugging discoveries:**
```
Team chat: "Found an interesting race condition using the debugger's
thread view—the issue wasn't visible with logging because of timing"
```

## Debugger Workflows by Scenario

### Bug Investigation Workflow

**Step 1: Reproduce with Debugger Attached**
```typescript
// Instead of adding logs throughout the function
function processOrder(order: Order): ProcessResult {
  console.log('Processing order:', order.id); // ❌ Print debugging

  const validationResult = validateOrder(order);
  console.log('Validation:', validationResult); // ❌ More prints

  if (!validationResult.isValid) {
    console.log('Order invalid:', validationResult.errors); // ❌ Even more prints
    return { success: false, errors: validationResult.errors };
  }

  // ... more logging throughout
}

// ✅ Use debugger: Set breakpoint at function entry, step through execution
```

**Step 2: Interactive Investigation**
1. Set breakpoint at suspicious location
2. Inspect variables without code modification
3. Step through execution and evaluate expressions
4. Modify state to test hypotheses in debug console

### Code Comprehension Workflow

**Understanding Unfamiliar Code:**
```typescript
// When encountering complex code like this:
function calculatePricing(cart: Cart, user: User, promotions: Promotion[]): PricingResult {
  const basePrice = cart.items.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0);

  const discounts = promotions
    .filter(p => isEligible(user, p))
    .map(p => calculateDiscount(basePrice, p))
    .reduce((max, current) => Math.max(max, current), 0);

  return {
    basePrice,
    discount: discounts,
    finalPrice: basePrice - discounts,
    breakdown: generateBreakdown(cart, promotions)
  };
}

// ✅ Use debugger to understand execution:
// 1. Set breakpoint at function entry
// 2. Step through each operation
// 3. Inspect intermediate values (basePrice, eligible promotions, etc.)
// 4. Understand data transformations without guessing
```

### Integration Debugging Workflow

**API Integration Issues:**
```typescript
// Complex API interaction debugging
async function syncUserData(userId: string): Promise<SyncResult> {
  try {
    const userData = await fetchUserFromAPI(userId);
    const processedData = transformUserData(userData);
    const saveResult = await saveToDatabase(processedData);
    return { success: true, userId: saveResult.id };
  } catch (error) {
    // ❌ Print debugging approach:
    console.log('Error in sync:', error);
    console.log('User ID:', userId);
    // Limited context, no visibility into intermediate states
  }
}

// ✅ Debugger approach:
// 1. Set breakpoints at each async operation
// 2. Inspect actual API response structure
// 3. Watch data transformation step by step
// 4. Examine error object properties and stack
// 5. Test alternative data handling in debug console
```

## Platform-Specific Setup

**JavaScript/Node.js:** `node --inspect app.js`, use Chrome DevTools or VS Code debugging
**Python:** `import pdb; pdb.set_trace()` or VS Code Python debugger
**Go:** Install Delve (`dlv debug`), configure VS Code Go extension
**Rust:** Use GDB/LLDB (`rust-gdb target/debug/app`) or VS Code LLDB
**Browser:** F12 DevTools, set conditional breakpoints, use `debugger;` statements

## Advanced Techniques

**Conditional Breakpoints:** Stop only when conditions are met (`order.total > 1000`)
**Logging Breakpoints:** Print without stopping execution
**Memory Debugging:** Use DevTools Memory tab, compare heap snapshots
**Performance Debugging:** Record operations, analyze call stacks and timing
**Remote Debugging:** Configure containers with exposed debug ports
**Production Debugging:** Use feature flags and correlation IDs for safe debugging

## Debugger vs. Print Debugging

**Speed:** Debugger workflows 2-3 minutes vs. print debugging 5-15 minutes per cycle
**Information:** Debuggers show complete object state, prototype chain, and scope; prints show limited formatted output
**Modification:** Debuggers allow real-time state changes; prints require code modification and restart
**Artifacts:** Debuggers leave no code artifacts; prints require cleanup and can be accidentally committed

## Success Metrics

**Team Indicators:** Fewer print statements in PRs, faster bug resolution, detailed bug reports
**Individual Skills:** Beginner (breakpoints, stepping) → Intermediate (conditional breakpoints, async debugging) → Advanced (remote debugging, performance analysis)
**Measurement:** Track PRs with debugging artifacts, debugging technique sharing, average bug resolution time

## Common Scenarios

**Race Conditions:** Set breakpoints in concurrent calls, observe execution order, inspect actual read/write values
**State Transformations:** Breakpoint before pipeline, step through operations, inspect intermediate results
**Exception Handling:** Enable "break on exceptions", examine full error context and variable state

## Related Patterns

**Tooling Investment:** Debugger mastery is a high-ROI skill that compounds over time through daily use.

**Fail-Fast Validation:** Debuggers help identify problems quickly by providing immediate feedback about program state.

**No Secret Suppression:** Debuggers reveal hidden state and execution paths that print debugging might miss.
