// src/examples.ts - Example usage of the tuple store system

import { CoreTupleStore } from "./CoreTupleStore";
import { JournaledTupleStore } from "./JournaledTupleStore";
import { ObservableTupleStore } from "./ObservableTupleStore";
import { createTupleStore } from "./factory";
import {
  JournaledTupleStore as IJournaledTupleStore,
  ObservableTupleStore as IObservableTupleStore,
} from "./TupleStore";

// Example 1: Using the core TupleStore directly
function basicExample() {
  console.log("Example 1: Core TupleStore");

  // Create a basic in-memory tuple store
  const store = new CoreTupleStore();

  // Set some values
  store.set("user.name", "John");
  store.set("user.profile.email", "john@example.com");
  store.set("user.profile.address.city", "New York");

  // Retrieve values
  console.log("User name:", store.get("user.name")); // John
  console.log("User profile:", store.getBranch("user.profile")); // { email: '...', address: { city: '...' } }

  // Check if paths exist
  console.log("Has email?", store.has("user.profile.email")); // true
  console.log("Has phone?", store.has("user.profile.phone")); // false

  // Find paths using wildcards
  console.log("Profile fields:", store.find("user.profile.*")); // ['user.profile.email', 'user.profile.address']

  // Delete a value
  store.delete("user.profile.email");
  console.log("After delete:", store.getBranch("user.profile")); // { address: { city: '...' } }

  // Import/export data
  const data = {
    settings: {
      theme: "dark",
      notifications: true,
    },
  };

  store.import(data);
  console.log("Imported data:", store.export());
}

// Example 2: Using JournaledTupleStore for transactions
function journalingExample() {
  console.log("\nExample 2: JournaledTupleStore");

  // Create a journaled tuple store
  const store = new JournaledTupleStore();

  // Set some initial values
  store.set("user.name", "John");
  store.set("user.balance", 100);

  console.log("Initial state:", store.export());
  console.log("Journal entries:", store.getJournal().length); // 2 entries

  // Perform a transaction (e.g., transferring money)
  try {
    store.beginTransaction();

    // Decrease one account
    store.set("user.balance", 50);

    // Increase another account
    store.set("recipient.balance", 150);

    // Something went wrong - rollback!
    // In a real app, this would be in a catch block
    if (Math.random() < 0.5) {
      throw new Error("Transaction failed");
    }

    // Otherwise, commit the transaction
    store.commitTransaction();
    console.log("Transaction committed");
  } catch (error) {
    console.log("Error:", (error as Error).message);
    store.rollbackTransaction();
    console.log("Transaction rolled back");
  }

  console.log("Final state:", store.export());
  console.log("Journal entries:", store.getJournal().length);
}

// Example 3: Using ObservableTupleStore for reactive updates
function observableExample() {
  console.log("\nExample 3: ObservableTupleStore");

  // Create an observable tuple store
  const store = new ObservableTupleStore();

  // Subscribe to changes in the user profile
  const unsubscribe = store.subscribe(
    "user.profile.**",
    (newValue, oldValue, path) => {
      console.log(`Change at ${path.join(".")}:`);
      console.log("  Old value:", oldValue);
      console.log("  New value:", newValue);
    }
  );

  // Make some changes
  store.set("user.profile.name", "John");
  store.set("user.profile.email", "john@example.com");

  // Update a value
  store.set("user.profile.name", "Johnny");

  // Delete a value
  store.delete("user.profile.email");

  // Unsubscribe when done
  unsubscribe();

  // This change won't trigger notifications because we unsubscribed
  store.set("user.profile.age", 30);
}

// Example 4: Composing stores with decorators
function composingExample() {
  console.log("\nExample 4: Composing stores with decorators");

  // Create a fully decorated store
  const coreStore = new CoreTupleStore();
  const journaledStore = new JournaledTupleStore({ store: coreStore });
  const observableStore = new ObservableTupleStore({ store: journaledStore });

  // Set up a subscription
  observableStore.subscribe("user.**", (newValue, oldValue, path) => {
    console.log(
      `Change at ${path.join(".")}: ${JSON.stringify(
        oldValue
      )} → ${JSON.stringify(newValue)}`
    );
  });

  // Access the journaled store to work with transactions
  const transaction = (
    journaledStore as IJournaledTupleStore
  ).beginTransaction();

  // Make changes through the transaction
  observableStore.set("user.name", "John");
  observableStore.set("user.email", "john@example.com");

  // Commit the transaction which will then trigger the notifications
  (journaledStore as IJournaledTupleStore).commitTransaction(transaction);

  // Check the journal
  console.log(
    "Journal entries:",
    (journaledStore as IJournaledTupleStore).getJournal().length
  );
}

// Example 5: Using the factory for convenience
function factoryExample() {
  console.log("\nExample 5: Using the factory for convenience");

  // Create different configurations using the factory
  const basicStore = createTupleStore({ journal: false, observable: false });
  const journaledStore = createTupleStore({ observable: false });
  const observableStore = createTupleStore({ journal: false });
  const fullStore = createTupleStore();

  console.log("Basic store type:", basicStore.constructor.name);
  console.log("Journaled store type:", journaledStore.constructor.name);
  console.log("Observable store type:", observableStore.constructor.name);
  console.log("Full store type:", fullStore.constructor.name);

  // Full store can be used with all features
  if ("subscribe" in fullStore) {
    const unsubscribe = (fullStore as IObservableTupleStore).subscribe(
      "user.**",
      () => {
        console.log("Change detected!");
      }
    );

    if ("beginTransaction" in (fullStore as any).store) {
      const journaledLayer = (fullStore as any).store as IJournaledTupleStore;
      journaledLayer.beginTransaction();
      fullStore.set("user.name", "John");
      journaledLayer.commitTransaction();
    }
  }
}

// Run all examples
export function runAllExamples() {
  basicExample();
  journalingExample();
  observableExample();
  composingExample();
  factoryExample();
}

// If this file is run directly
if (require.main === module) {
  runAllExamples();
}
