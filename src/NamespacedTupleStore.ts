// src/NamespacedTupleStore.ts
import { TupleStore, TupleStoreOptions } from "./TupleStore";

export interface NamespacedTupleStoreOptions {
  store: TupleStore;
  namespace: string;
}

export class NamespacedTupleStore implements TupleStore {
  private store: TupleStore;
  private namespace: string;

  constructor(options: NamespacedTupleStoreOptions) {
    this.store = options.store;
    this.namespace = options.namespace;
  }

  private prefixKey(key: string | string[]): string {
    if (Array.isArray(key)) {
      return `${this.namespace}.${key.join('.')}`;
    }
    return `${this.namespace}.${key}`;
  }

  get(path: string | string[]): any {
    return this.store.get(this.prefixKey(path));
  }

  getBranch(path?: string | string[]): any {
    if (path === undefined) {
      // Get everything in this namespace
      return this.store.getBranch(this.namespace);
    }
    return this.store.getBranch(this.prefixKey(path));
  }

  has(path: string | string[]): boolean {
    return this.store.has(this.prefixKey(path));
  }

  set(path: string | string[], value: any, options?: TupleStoreOptions): boolean {
    return this.store.set(this.prefixKey(path), value, options);
  }

  delete(path: string | string[], options?: TupleStoreOptions): boolean {
    return this.store.delete(this.prefixKey(path), options);
  }

  find(pattern: string | string[]): string[] {
    // Prefix the pattern with the namespace
    const prefixedPattern = 
      Array.isArray(pattern) 
        ? [this.namespace, ...pattern].join('.')
        : `${this.namespace}.${pattern}`;
    
    // Get all matches from the store
    const matches = this.store.find(prefixedPattern);
    
    // Remove the namespace prefix from each match
    const prefixLength = this.namespace.length + 1; // +1 for the dot
    const results = matches.map(key => key.substring(prefixLength));
    
    // Remove duplicates
    return [...new Set(results)];
  }

  clear(options?: TupleStoreOptions): boolean {
    // Use find to get all keys in this namespace
    const keysToDelete = this.store.find(`${this.namespace}.**`);
    
    // Delete all keys in this namespace
    for (const key of keysToDelete) {
      this.store.delete(key, options);
    }
    
    return true;
  }

  import(data: object, options?: TupleStoreOptions): boolean {
    // Wrap the data in the namespace
    const wrappedData = { [this.namespace]: data };
    return this.store.import(wrappedData, options);
  }

  export(path?: string | string[]): any {
    if (path === undefined) {
      // Get everything in the namespace
      const data = this.store.export(this.namespace);
      return data;
    }
    return this.store.export(this.prefixKey(path));
  }

  subscribe(
    path: string | string[],
    callback: (newValue: any, oldValue: any, path: string[]) => void
  ): () => void {
    // If the pattern is a glob pattern that would match anything
    const pathStr = Array.isArray(path) ? path.join('.') : path;
    
    if (pathStr === "**") {
      // Only match patterns within this namespace
      const namespacedCallback = (newValue: any, oldValue: any, fullPath: string[]) => {
        // Remove the namespace from the path passed to the callback
        const localPath = fullPath.slice(1);
        callback(newValue, oldValue, localPath);
      };
      return this.store.subscribe(`${this.namespace}.**`, namespacedCallback);
    } else {
      // Otherwise prefix the specific pattern with the namespace
      const namespacedCallback = (newValue: any, oldValue: any, fullPath: string[]) => {
        // Remove the namespace from the path passed to the callback
        const localPath = fullPath.slice(1);
        callback(newValue, oldValue, localPath);
      };
      return this.store.subscribe(this.prefixKey(path), namespacedCallback);
    }
  }
}
