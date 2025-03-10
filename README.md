# tuple-store

Tuple Store is a versatile library for managing hierarchical data structures with support for transactions, reactive updates, and namespaced data isolation. It is designed to be used in both JavaScript and TypeScript projects and provides a robust foundation for state management in applications that need organized, modular data access patterns.

## Features

- **Core Data Store**: Hierarchical key-value access using dot notation
- **Journaling**: Transaction support with commit/rollback capabilities
- **Observable**: Subscribe to changes with wildcard pattern matching
- **Namespaced**: Isolate data access within specific namespaces
- **Composable**: Layer functionality through decorator pattern
- **Factory Pattern**: Easy configuration for different use cases
- **TypeScript Support**: Full type definitions included

## Installation

```bash
# Install with npm
npm install tuple-store

# Install with Yarn
yarn add tuple-store

# Install with Bun
bun add tuple-store
```

## Basic Usage

```typescript
import { createTupleStore } from 'tuple-store';

// Create a full-featured store (with both journaling and observability)
const store = createTupleStore();

// Set values using dot notation
store.set('user.profile.name', 'John Doe');
store.set('user.profile.email', 'john@example.com');

// Get values
const name = store.get('user.profile.name'); // 'John Doe'

// Check if a path exists
const hasEmail = store.has('user.profile.email'); // true

// Delete values
store.delete('user.profile.email');

// Get entire branches
const profile = store.getBranch('user.profile'); // { name: 'John Doe' }

// Export/import data
const data = store.export();
store.import(data);
```

## Advanced Usage

### Pattern Matching & Finding Paths

```typescript
// Find paths matching a pattern
store.set('users.0.name', 'Alice');
store.set('users.0.role', 'Admin');
store.set('users.1.name', 'Bob');
store.set('users.1.role', 'Editor');

// Find all user names
const userNames = store.find('users.*.name'); // ['users.0.name', 'users.1.name']
```

### Journaling & Transactions

```typescript
import { createTupleStore } from 'tuple-store';

const store = createTupleStore();

// Start a transaction
store.beginTransaction();

// Make changes
store.set('user.name', 'Alice');
store.set('user.role', 'Admin');

// Commit changes (or rollback if needed)
store.commitTransaction();
// store.rollbackTransaction(); // Undoes all changes in the transaction

// Access the journal
const journal = store.getJournal();
```

### Subscriptions & Reactivity

```typescript
import { createTupleStore } from 'tuple-store';

const store = createTupleStore();

// Subscribe to specific path
store.subscribe('user.name', (newValue, oldValue, path) => {
  console.log(`Name changed from ${oldValue} to ${newValue}`);
});

// Subscribe using wildcards
store.subscribe('user.*', callback); // All direct properties under user
store.subscribe('user.**', callback); // All properties under user (any depth)

// Unsubscribe
const unsubscribe = store.subscribe('user.profile.email', callback);
unsubscribe(); // Stop receiving notifications
```

### Namespaced Stores

```typescript
import { createTupleStore, TupleStoreFactory, NamespacedTupleStore } from 'tuple-store';

// Create a base store
const baseStore = createTupleStore();

// Create namespaced stores that share the same underlying storage
const userStore = new NamespacedTupleStore({
  store: baseStore,
  namespace: 'user'
});

const settingsStore = new NamespacedTupleStore({
  store: baseStore,
  namespace: 'settings'
});

// Use each store within its isolated namespace
userStore.set('name', 'John');       // Stored as 'user.name' in the base store
settingsStore.set('theme', 'dark');  // Stored as 'settings.theme' in the base store

// Each store only sees its own namespace
console.log(userStore.get('name'));       // 'John'
console.log(settingsStore.get('theme'));  // 'dark'

// The base store sees everything with namespaces
console.log(baseStore.get('user.name'));       // 'John'
console.log(baseStore.get('settings.theme'));  // 'dark'

// Create a namespaced store directly with the factory
const appStore = createTupleStore({ 
  namespace: 'app',
  observable: true
});

// All other features like observability work through the namespace
appStore.subscribe('**', (value, oldValue, path) => {
  console.log(`App data changed at ${path.join('.')}`);
});

appStore.set('version', '1.0.0'); // Triggers callback with path ['version']
```

### Custom Store Configuration

```typescript
import { createTupleStore, TupleStoreFactory } from 'tuple-store';

// Core store only (no journaling or observability)
const basicStore = TupleStoreFactory.createBasic();

// Only journaling
const journaledStore = TupleStoreFactory.createJournaled();

// Only observability
const observableStore = TupleStoreFactory.createObservable();

// Namespaced store
const userStore = TupleStoreFactory.createNamespaced('user');

// Custom configuration
const customStore = createTupleStore({
  journal: true,
  observable: true,
  namespace: 'custom', // Optional namespace
  maxJournalEntries: 500,
  journalEnabled: true
});
```

## License

MIT
