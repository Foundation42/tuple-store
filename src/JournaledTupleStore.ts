// src/JournaledTupleStore.ts - TupleStore decorator that adds journaling and transactions

import {
  TupleStore,
  JournaledTupleStore as IJournaledTupleStore,
  TupleStoreOptions,
} from "./TupleStore";

/**
 * Journal entry types
 */
type JournalEntryType = "set" | "delete" | "clear" | "import" | "transaction";

/**
 * Structure of a journal entry
 */
interface JournalEntry {
  type: JournalEntryType;
  path?: string[];
  value?: any;
  oldValue?: any;
  timestamp: number;
  data?: any;
  id?: string;
  operations?: any[];
  previousState?: any;
}

/**
 * Structure of a transaction
 */
interface Transaction {
  id: string;
  operations: any[];
  timestamp: number;
}

/**
 * Options for JournaledTupleStore
 */
interface JournaledTupleStoreOptions {
  store?: TupleStore;
  journalEnabled?: boolean;
  maxJournalEntries?: number;
}

/**
 * JournaledTupleStore adds journaling and transaction capabilities to any TupleStore.
 * It implements the decorator pattern, wrapping another TupleStore implementation.
 */
export class JournaledTupleStore implements IJournaledTupleStore {
  /**
   * The underlying tuple store
   */
  protected store: TupleStore;

  /**
   * Journal of operations
   */
  protected journal: JournalEntry[];

  /**
   * Whether journaling is enabled
   */
  protected journalEnabled: boolean;

  /**
   * Maximum number of journal entries to keep
   */
  protected maxJournalEntries: number;

  /**
   * Current active transaction
   */
  protected currentTransaction: Transaction | null;

  /**
   * Create a new JournaledTupleStore
   */
  constructor(options: JournaledTupleStoreOptions = {}) {
    this.store = options.store || new CoreTupleStore();
    this.journal = [];
    this.journalEnabled = options.journalEnabled !== false;
    this.maxJournalEntries = options.maxJournalEntries || 1000;
    this.currentTransaction = null;
  }

  /**
   * Set a value with journaling
   */
  set(
    path: string | string[],
    value: any,
    options: TupleStoreOptions = {}
  ): boolean {
    // Process options
    const journal = options.journal !== false && this.journalEnabled;
    const transaction = options.transaction || this.currentTransaction;

    // Get old value for journaling
    const oldValue = this.get(path);

    // Set the value in the underlying store
    const result = this.store.set(path, value, options);

    if (result) {
      // Add to journal if enabled and specifically not disabled for this operation
      if (journal && !transaction && options.journal !== false) {
        this.addJournalEntry({
          type: "set",
          path: this.normalizePath(path),
          value,
          oldValue,
          timestamp: Date.now(),
        });
      } else if (transaction) {
        transaction.operations.push({
          type: "set",
          path: this.normalizePath(path),
          value,
          oldValue,
        });
      }
    }

    return result;
  }

  /**
   * Delete a value with journaling
   */
  delete(path: string | string[], options: TupleStoreOptions = {}): boolean {
    const journal = options.journal !== false && this.journalEnabled;
    const transaction = options.transaction || this.currentTransaction;

    // Get old value for journaling
    const oldValue = this.get(path);

    // Delete the value from the underlying store
    const result = this.store.delete(path, options);

    if (result) {
      // Add to journal if enabled and specifically not disabled for this operation
      if (journal && !transaction && options.journal !== false) {
        this.addJournalEntry({
          type: "delete",
          path: this.normalizePath(path),
          oldValue,
          timestamp: Date.now(),
        });
      } else if (transaction) {
        transaction.operations.push({
          type: "delete",
          path: this.normalizePath(path),
          oldValue,
        });
      }
    }

    return result;
  }

  /**
   * Clear the store with journaling
   */
  clear(options: TupleStoreOptions = {}): boolean {
    const journal = options.journal !== false && this.journalEnabled;

    // Get a snapshot before clearing if we're journaling
    const snapshot = journal ? this.export() : null;
    
    // Clear the journal first
    if (options.clearJournal !== false) {
      this.clearJournal();
    }

    // Clear the underlying store
    const result = this.store.clear(options);

    // Add to journal if enabled and specifically not disabled for this operation
    if (journal && result && options.journal !== false) {
      this.addJournalEntry({
        type: "clear",
        previousState: snapshot,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * Import data with journaling
   */
  import(data: object, options: TupleStoreOptions = {}): boolean {
    const journal = options.journal !== false && this.journalEnabled;

    // Import to the underlying store
    const result = this.store.import(data, options);

    // Add to journal if enabled and specifically not disabled for this operation
    if (journal && result && options.journal !== false) {
      this.addJournalEntry({
        type: "import",
        data,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * Begin a transaction
   */
  beginTransaction(): Transaction {
    if (this.currentTransaction) {
      throw new Error(
        "Cannot begin a transaction while another is in progress"
      );
    }

    this.currentTransaction = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      operations: [],
      timestamp: Date.now(),
    };

    return this.currentTransaction;
  }

  /**
   * Commit a transaction
   */
  commitTransaction(
    transaction: Transaction = this.currentTransaction!
  ): boolean {
    if (!transaction) {
      throw new Error("No transaction to commit");
    }

    if (transaction !== this.currentTransaction) {
      throw new Error(
        "Cannot commit a transaction that is not the current one"
      );
    }

    // Add transaction to journal
    if (this.journalEnabled) {
      this.addJournalEntry({
        type: "transaction",
        id: transaction.id,
        operations: transaction.operations,
        timestamp: Date.now(),
      });
    }

    this.currentTransaction = null;
    return true;
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction(
    transaction: Transaction = this.currentTransaction!
  ): boolean {
    if (!transaction) {
      throw new Error("No transaction to rollback");
    }

    if (transaction !== this.currentTransaction) {
      throw new Error(
        "Cannot rollback a transaction that is not the current one"
      );
    }

    // Reverse all operations
    for (let i = transaction.operations.length - 1; i >= 0; i--) {
      const operation = transaction.operations[i];

      if (operation.type === "set") {
        // Restore old value
        this.store.set(operation.path, operation.oldValue);
      } else if (
        operation.type === "delete" &&
        operation.oldValue !== undefined
      ) {
        // Restore deleted value
        this.store.set(operation.path, operation.oldValue);
      }
    }

    this.currentTransaction = null;
    return true;
  }

  /**
   * Add an entry to the journal
   */
  protected addJournalEntry(entry: JournalEntry): void {
    if (!this.journalEnabled) return;

    this.journal.push(entry);

    // Trim journal if needed
    if (this.journal.length > this.maxJournalEntries) {
      this.journal = this.journal.slice(-this.maxJournalEntries);
    }
  }

  /**
   * Get the journal
   */
  getJournal(): JournalEntry[] {
    return [...this.journal];
  }

  /**
   * Clear the journal
   */
  clearJournal(): void {
    this.journal = [];
  }

  /**
   * Enable or disable journaling
   */
  setJournaling(enabled: boolean): void {
    this.journalEnabled = enabled;
    
    // When disabling journaling, clear the journal
    if (!enabled) {
      this.clearJournal();
    }
  }

  /**
   * Normalize a path to an array (helper method)
   */
  protected normalizePath(path: string | string[]): string[] {
    if (Array.isArray(path)) {
      return [...path];
    }

    if (path === "" || path === undefined) {
      return [];
    }

    return String(path).split(".");
  }

  // ============== Pass-through Methods ==============

  /**
   * Get a value (pass-through to underlying store)
   */
  get(path: string | string[]): any {
    return this.store.get(path);
  }

  /**
   * Get a branch (pass-through to underlying store)
   */
  getBranch(path?: string | string[]): any {
    return this.store.getBranch(path);
  }

  /**
   * Check if path exists (pass-through to underlying store)
   */
  has(path: string | string[]): boolean {
    return this.store.has(path);
  }

  /**
   * Find paths (pass-through to underlying store)
   */
  find(pattern: string | string[]): string[] {
    return this.store.find(pattern);
  }

  /**
   * Export data (pass-through to underlying store)
   */
  export(path?: string | string[]): any {
    return this.store.export(path);
  }
}

// Import for when used directly from this file
import { CoreTupleStore } from "./CoreTupleStore";
