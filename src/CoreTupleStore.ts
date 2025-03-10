// src/CoreTupleStore.ts - Base implementation of the TupleStore interface

import { TupleStore, TupleStoreOptions } from "./TupleStore";

/**
 * CoreTupleStore provides the basic in-memory implementation of the TupleStore interface.
 * This is the foundation upon which other decorators can add functionality.
 */
export class CoreTupleStore implements TupleStore {
  /**
   * The root data object
   */
  protected data: Record<string, any>;

  /**
   * Create a new CoreTupleStore
   */
  constructor() {
    this.data = {};
  }

  /**
   * Set a value at the specified path
   */
  set(
    path: string | string[],
    value: any,
    options?: TupleStoreOptions
  ): boolean {
    const normalizedPath = this.normalizePath(path);
    this.setNestedValue(this.data, normalizedPath, value);
    return true;
  }

  /**
   * Get a value from the specified path
   */
  get(path: string | string[]): any {
    const normalizedPath = this.normalizePath(path);
    return this.getNestedValue(this.data, normalizedPath);
  }

  /**
   * Get a complete branch of the tree as a JSON object
   */
  getBranch(path: string | string[] = ""): any {
    if (!path || path === "") {
      // Return a deep clone of the entire store
      return structuredClone(this.data);
    }

    const normalizedPath = this.normalizePath(path);
    const branch = this.getNestedValue(this.data, normalizedPath);

    if (branch === undefined) {
      return {};
    }

    // Return a deep clone to prevent accidental modifications
    return typeof branch === "object" && branch !== null
      ? structuredClone(branch)
      : branch;
  }

  /**
   * Check if a path exists in the store
   */
  has(path: string | string[]): boolean {
    const normalizedPath = this.normalizePath(path);
    let current = this.data;

    for (const key of normalizedPath) {
      if (current === undefined || current === null || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return true;
  }

  /**
   * Delete a value at the specified path
   */
  delete(path: string | string[], options?: TupleStoreOptions): boolean {
    const normalizedPath = this.normalizePath(path);

    // Can't delete the root
    if (normalizedPath.length === 0) {
      return false;
    }

    // Get parent object and delete the property
    const parentPath = normalizedPath.slice(0, -1);
    const key = normalizedPath[normalizedPath.length - 1];
    const parent =
      parentPath.length === 0
        ? this.data
        : this.getNestedValue(this.data, parentPath);

    if (parent === undefined || parent === null || typeof parent !== "object") {
      return false;
    }

    // Delete the property
    const existed = key in parent;
    delete parent[key];

    return existed;
  }

  /**
   * Find all paths matching a pattern
   */
  find(pattern: string | string[]): string[] {
    const patternParts = this.normalizePath(pattern);
    const results: string[] = [];

    // Helper function to recursively search the object tree
    const search = (obj: any, currentPath: string[], patternIndex: number) => {
      if (patternIndex >= patternParts.length) {
        // We've reached the end of the pattern, add the path
        results.push(currentPath.join("."));
        return;
      }

      const part = patternParts[patternIndex];

      if (part === "*") {
        // Wildcard - search all properties at this level
        if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj)) {
            search(obj[key], [...currentPath, key], patternIndex + 1);
          }
        }
      } else if (part === "**") {
        // Recursive wildcard - match any number of segments
        // Add the current path
        results.push(currentPath.join("."));

        // Continue searching if we have an object
        if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj)) {
            // Keep the ** in place to match deeper levels
            search(obj[key], [...currentPath, key], patternIndex);
            // Or skip it to match next segment
            search(obj[key], [...currentPath, key], patternIndex + 1);
          }
        }
      } else if (obj && typeof obj === "object" && part in obj) {
        // Exact match
        search(obj[part], [...currentPath, part], patternIndex + 1);
      }
    };

    search(this.data, [], 0);
    return results;
  }

  /**
   * Clear the store to empty state
   */
  clear(options?: TupleStoreOptions): boolean {
    this.data = {};
    return true;
  }

  /**
   * Import data into the store
   */
  import(data: object, options?: TupleStoreOptions): boolean {
    const reset = options?.reset !== false;

    // Optionally reset the store
    if (reset) {
      this.clear();
    }

    // Import the data (deep clone to prevent external modifications)
    this.data = structuredClone(data);

    return true;
  }

  /**
   * Export data from the store
   */
  export(path: string | string[] = ""): any {
    return this.getBranch(path);
  }

  // ============== Helper Methods ==============

  /**
   * Normalize a path to an array
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

  /**
   * Get a nested value from an object
   */
  protected getNestedValue(obj: any, path: string[]): any {
    let current = obj;

    for (const key of path) {
      if (current === undefined || current === null) {
        return undefined;
      }

      current = current[key];
    }

    return current;
  }

  /**
   * Set a nested value in an object
   */
  protected setNestedValue(obj: any, path: string[], value: any): any {
    if (path.length === 0) {
      return value;
    }

    let current = obj;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];

      if (
        !(key in current) ||
        current[key] === null ||
        typeof current[key] !== "object"
      ) {
        current[key] = {};
      }

      current = current[key];
    }

    current[path[path.length - 1]] = value;
    return obj;
  }
}
