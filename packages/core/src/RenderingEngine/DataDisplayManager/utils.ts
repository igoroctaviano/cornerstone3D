  /**
   * Creates a cache key from dependencies by extracting only serializable properties
   * This avoids circular reference errors when dependencies contain complex objects
   */
  export function createCacheKey(id: string, dependencies: any): string {
    const safeDeps: any = {};

    // Extract only serializable properties (primitives and plain objects)
    Object.keys(dependencies).forEach((key) => {
      const value = dependencies[key];
      // Skip functions, undefined, and objects that might have circular references
      if (
        value !== undefined &&
        value !== null &&
        typeof value !== 'function'
      ) {
        try {
          // Try to stringify to check if it's serializable
          JSON.stringify(value);
          safeDeps[key] = value;
        } catch (e) {
          // Skip non-serializable values (circular references, etc.)
        }
      }
    });

    return `${id}-${JSON.stringify(safeDeps)}`;
  }