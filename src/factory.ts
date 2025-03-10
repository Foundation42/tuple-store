// src/factory.ts - Convenience factory for creating tuple stores

import { CoreTupleStore } from "./CoreTupleStore";
import { JournaledTupleStore } from "./JournaledTupleStore";
import { NamespacedTupleStore } from "./NamespacedTupleStore";
import { ObservableTupleStore } from "./ObservableTupleStore";
import { TupleStore } from "./TupleStore";

/**
 * Configuration options for the tuple store factory
 */
export interface TupleStoreFactoryOptions {
  /**
   * Whether to include journaling capabilities
   * @default true
   */
  journal?: boolean;

  /**
   * Whether to include subscription capabilities
   * @default true
   */
  observable?: boolean;

  /**
   * Optional namespace for the store
   * If provided, all operations will be scoped to this namespace
   */
  namespace?: string;

  /**
   * Maximum number of journal entries to keep
   * @default 1000
   */
  maxJournalEntries?: number;

  /**
   * Whether journaling is enabled initially
   * @default true
   */
  journalEnabled?: boolean;
}

/**
 * Create a tuple store with the specified capabilities
 *
 * @example
 * // Create a basic store
 * const basicStore = createTupleStore({ journal: false, observable: false });
 *
 * @example
 * // Create a store with journaling only
 * const journaledStore = createTupleStore({ observable: false });
 *
 * @example
 * // Create a store with subscriptions only
 * const observableStore = createTupleStore({ journal: false });
 *
 * @example
 * // Create a full-featured store (default)
 * const store = createTupleStore();
 * 
 * @example
 * // Create a namespaced store
 * const userStore = createTupleStore({ namespace: 'user' });
 *
 * @param options Configuration options
 * @returns A configured tuple store
 */
export function createTupleStore(
  options: TupleStoreFactoryOptions = {}
): TupleStore {
  // Start with the core store
  let store: TupleStore = new CoreTupleStore();

  // Add journaling if requested
  if (options.journal !== false) {
    store = new JournaledTupleStore({
      store,
      journalEnabled: options.journalEnabled,
      maxJournalEntries: options.maxJournalEntries,
    });
  }

  // Add observability if requested
  if (options.observable !== false) {
    store = new ObservableTupleStore({ store });
  }
  
  // Add namespace if requested
  if (options.namespace) {
    store = new NamespacedTupleStore({
      store,
      namespace: options.namespace
    });
  }

  return store;
}

/**
 * Factory object for creating various tuple store configurations
 */
export const TupleStoreFactory = {
  /**
   * Create a basic tuple store without journaling or observability
   */
  createBasic(): TupleStore {
    return new CoreTupleStore();
  },
  
  /**
   * Create a journaled tuple store
   */
  createJournaled(): TupleStore {
    return new JournaledTupleStore({
      store: new CoreTupleStore(),
    });
  },
  
  /**
   * Create an observable tuple store
   */
  createObservable(): TupleStore {
    return new ObservableTupleStore({
      store: new CoreTupleStore(),
    });
  },
  
  /**
   * Create a full-featured tuple store with both journaling and observability
   */
  createFullFeatured(): TupleStore {
    return new ObservableTupleStore({
      store: new JournaledTupleStore({
        store: new CoreTupleStore(),
      }),
    });
  },
  
  /**
   * Create a namespaced tuple store with the specified namespace
   * @param namespace The namespace to scope all operations to
   * @param baseStore Optional base store to use (creates new CoreTupleStore if not provided)
   */
  createNamespaced(namespace: string, baseStore?: TupleStore): TupleStore {
    return new NamespacedTupleStore({
      store: baseStore || new CoreTupleStore(),
      namespace
    });
  },
  
  /**
   * Create a customized tuple store with the specified options
   */
  create(options: TupleStoreFactoryOptions = {}): TupleStore {
    return createTupleStore(options);
  }
};

// Default export is a convenience function that creates a full-featured store
export default createTupleStore;
