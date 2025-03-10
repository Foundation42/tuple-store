// src/TupleStore.ts - Interface definition for TupleStore implementations

/**
 * Options for various tuple store operations
 */
export interface TupleStoreOptions {
  /**
   * Whether to add this operation to the journal (if supported)
   */
  journal?: boolean;

  /**
   * Whether to notify subscribers about this change (if supported)
   */
  silent?: boolean;

  /**
   * Whether to reset the store on import
   */
  reset?: boolean;

  /**
   * Current transaction (if any)
   */
  transaction?: any;

  /**
   * Any additional options
   */
  [key: string]: any;
}

/**
 * Interface for all TupleStore implementations.
 * Defines the standard operations that all tuple stores must support.
 */
export interface TupleStore {
  /**
   * Set a value at the specified path
   * @param path - Dot-notation path or path array
   * @param value - Value to set at the path
   * @param options - Operation options
   * @returns Success status
   */
  set(
    path: string | string[],
    value: any,
    options?: TupleStoreOptions
  ): boolean;

  /**
   * Get a value from the specified path
   * @param path - Dot-notation path or path array
   * @returns Value at the path or undefined
   */
  get(path: string | string[]): any;

  /**
   * Get a complete branch of the tree as a JSON object
   * @param path - Root path of the branch to get
   * @returns Branch as a JSON object
   */
  getBranch(path?: string | string[]): any;

  /**
   * Check if a path exists in the store
   * @param path - Path to check
   * @returns True if the path exists
   */
  has(path: string | string[]): boolean;

  /**
   * Delete a value at the specified path
   * @param path - Path to delete
   * @param options - Operation options
   * @returns Success status
   */
  delete(path: string | string[], options?: TupleStoreOptions): boolean;

  /**
   * Find all paths matching a pattern
   * @param pattern - Path pattern with * wildcards
   * @returns Array of matching paths
   */
  find(pattern: string | string[]): string[];

  /**
   * Clear the store to empty state
   * @param options - Operation options
   * @returns Success status
   */
  clear(options?: TupleStoreOptions): boolean;

  /**
   * Import data into the store
   * @param data - Data to import
   * @param options - Import options
   * @returns Success status
   */
  import(data: object, options?: TupleStoreOptions): boolean;

  /**
   * Export data from the store
   * @param path - Root path to export (defaults to entire store)
   * @returns Exported data
   */
  export(path?: string | string[]): any;
}

/**
 * Interface for TupleStore implementations that support journaling
 */
export interface JournaledTupleStore extends TupleStore {
  /**
   * Begin a transaction
   * @returns Transaction object
   */
  beginTransaction(): any;

  /**
   * Commit a transaction
   * @param transaction - Transaction object (defaults to current)
   * @returns Success status
   */
  commitTransaction(transaction?: any): boolean;

  /**
   * Rollback a transaction
   * @param transaction - Transaction object (defaults to current)
   * @returns Success status
   */
  rollbackTransaction(transaction?: any): boolean;

  /**
   * Get the journal
   * @returns Journal entries
   */
  getJournal(): any[];

  /**
   * Clear the journal
   */
  clearJournal(): void;

  /**
   * Enable or disable journaling
   * @param enabled - Whether journaling should be enabled
   */
  setJournaling(enabled: boolean): void;
}

/**
 * Interface for TupleStore implementations that support subscriptions
 */
export interface ObservableTupleStore extends TupleStore {
  /**
   * Subscribe to changes at a path
   * @param path - Path to subscribe to (can include * wildcards)
   * @param callback - Callback function(value, oldValue, path)
   * @returns Unsubscribe function
   */
  subscribe(
    path: string | string[],
    callback: (newValue: any, oldValue: any, path: string[]) => void
  ): () => void;
}

/**
 * Full-featured TupleStore with both journaling and observation
 */
export interface FullTupleStore
  extends JournaledTupleStore,
    ObservableTupleStore {}
