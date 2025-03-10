// src/ObservableTupleStore.ts - TupleStore decorator that adds subscription capabilities

import { TupleStore, ObservableTupleStore as IObservableTupleStore, TupleStoreOptions } from './TupleStore';

/**
 * Subscription callback function type
 */
type SubscriptionCallback = (newValue: any, oldValue: any, path: string[]) => void;

/**
 * Options for ObservableTupleStore
 */
interface ObservableTupleStoreOptions {
  store?: TupleStore;
}

/**
 * ObservableTupleStore adds subscription capabilities to any TupleStore.
 * It implements the decorator pattern, wrapping another TupleStore implementation.
 */
export class ObservableTupleStore implements IObservableTupleStore {
  /**
   * The underlying tuple store
   */
  protected store: TupleStore;
  
  /**
   * Map of paths to subscription callbacks
   */
  protected subscribers: Map<string, Set<SubscriptionCallback>>;
  
  /**
   * Create a new ObservableTupleStore
   */
  constructor(options: ObservableTupleStoreOptions = {}) {
    this.store = options.store || new CoreTupleStore();
    this.subscribers = new Map();
  }
  
  /**
   * Set a value and notify subscribers
   */
  set(path: string | string[], value: any, options: TupleStoreOptions = {}): boolean {
    const silent = options.silent === true;
    const oldValue = this.get(path);
    
    // Set the value in the underlying store
    const result = this.store.set(path, value, options);
    
    // Notify subscribers if successful and not silent
    if (result && !silent) {
      this.notifySubscribers(path, value, oldValue);
    }
    
    return result;
  }
  
  /**
   * Delete a value and notify subscribers
   */
  delete(path: string | string[], options: TupleStoreOptions = {}): boolean {
    const silent = options.silent === true;
    const oldValue = this.get(path);
    
    // Delete the value from the underlying store
    const result = this.store.delete(path, options);
    
    // Notify subscribers if successful and not silent
    if (result && !silent) {
      this.notifySubscribers(path, undefined, oldValue);
    }
    
    return result;
  }
  
  /**
   * Import data and notify subscribers
   */
  import(data: object, options: TupleStoreOptions = {}): boolean {
    const silent = options.silent === true;
    
    // Get the old state for notifications
    const oldState = silent ? null : this.export();
    
    // Import to the underlying store
    const result = this.store.import(data, options);
    
    // Notify root subscribers if not silent
    if (result && !silent) {
      this.notifySubscribers('', this.export(), oldState);
    }
    
    return result;
  }
  
  /**
   * Clear the store and notify subscribers
   */
  clear(options: TupleStoreOptions = {}): boolean {
    const silent = options.silent === true;
    
    // Get the old state for notifications
    const oldState = silent ? null : this.export();
    
    // Clear the underlying store
    const result = this.store.clear(options);
    
    // Notify root subscribers if not silent
    if (result && !silent) {
      this.notifySubscribers('', {}, oldState);
    }
    
    return result;
  }
  
  /**
   * Subscribe to changes at a path
   */
  subscribe(
    path: string | string[], 
    callback: SubscriptionCallback
  ): () => void {
    const normalizedPath = Array.isArray(path) 
      ? path.join('.') 
      : String(path);
    
    if (!this.subscribers.has(normalizedPath)) {
      this.subscribers.set(normalizedPath, new Set());
    }
    
    const handlers = this.subscribers.get(normalizedPath)!;
    handlers.add(callback);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(normalizedPath);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.subscribers.delete(normalizedPath);
        }
      }
    };
  }
  
  /**
   * Notify subscribers about a change
   * @private
   */
  protected notifySubscribers(path: string | string[], newValue: any, oldValue: any): void {
    const normalizedPath = Array.isArray(path) ? path : this.normalizePath(path);
    const pathString = normalizedPath.join('.');
    
    // For each subscription
    for (const [subscriberPath, callbacks] of this.subscribers.entries()) {
      // Check if this subscriber should be notified
      if (
        // Exact path match
        subscriberPath === pathString ||
        // Wildcard match
        (subscriberPath.includes('*') && this.matchesPattern(pathString, subscriberPath))
      ) {
        // Notify all callbacks
        for (const callback of callbacks) {
          try {
            callback(newValue, oldValue, normalizedPath);
          } catch (err) {
            console.error(`Error in subscriber callback for ${subscriberPath}:`, err);
          }
        }
      }
    }
  }
  
  /**
   * Check if a path matches a pattern
   * @private
   */
  protected matchesPattern(path: string, pattern: string): boolean {
    // Special case for deep wildcard
    if (pattern.endsWith('.**')) {
      const prefix = pattern.slice(0, -3);
      return path === prefix || path.startsWith(prefix + '.');
    }
    
    // Convert to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*\*/g, '.*') // ** matches any segments
      .replace(/\*/g, '[^.]+'); // * matches one segment
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
  
  /**
   * Normalize a path to an array (helper method)
   */
  protected normalizePath(path: string | string[]): string[] {
    if (Array.isArray(path)) {
      return [...path];
    }
    
    if (path === '' || path === undefined) {
      return [];
    }
    
    return String(path).split('.');
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

  /**
   * Pass-through for journal functions if underlying store supports them
   */
  getJournal(): any[] {
    if ('getJournal' in this.store) {
      return (this.store as any).getJournal();
    }
    throw new Error('Underlying store does not support journaling');
  }

  clearJournal(): void {
    if ('clearJournal' in this.store) {
      (this.store as any).clearJournal();
      return;
    }
    throw new Error('Underlying store does not support journaling');
  }

  setJournaling(enabled: boolean): void {
    if ('setJournaling' in this.store) {
      (this.store as any).setJournaling(enabled);
      return;
    }
    throw new Error('Underlying store does not support journaling');
  }

  beginTransaction(): any {
    if ('beginTransaction' in this.store) {
      return (this.store as any).beginTransaction();
    }
    throw new Error('Underlying store does not support transactions');
  }

  commitTransaction(transaction?: any): boolean {
    if ('commitTransaction' in this.store) {
      return (this.store as any).commitTransaction(transaction);
    }
    throw new Error('Underlying store does not support transactions');
  }

  rollbackTransaction(transaction?: any): boolean {
    if ('rollbackTransaction' in this.store) {
      return (this.store as any).rollbackTransaction(transaction);
    }
    throw new Error('Underlying store does not support transactions');
  }
}

// Import for when used directly from this file
import { CoreTupleStore } from './CoreTupleStore';