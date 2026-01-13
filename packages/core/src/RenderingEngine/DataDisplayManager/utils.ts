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

/**
 * Deep equality check for dependencies (similar to React's dependency comparison)
 * Compares serializable properties to detect changes
 */
export function dependenciesChanged(
  prevDeps: any,
  nextDeps: any
): boolean {
  if (prevDeps === nextDeps) {
    return false;
  }

  if (!prevDeps || !nextDeps) {
    return true;
  }

  const prevKeys = Object.keys(prevDeps);
  const nextKeys = Object.keys(nextDeps);

  if (prevKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of prevKeys) {
    if (!(key in nextDeps)) {
      return true;
    }

    const prevValue = prevDeps[key];
    const nextValue = nextDeps[key];

    if (prevValue === nextValue) {
      continue;
    }

    try {
      const prevSerialized = JSON.stringify(prevValue);
      const nextSerialized = JSON.stringify(nextValue);
      if (prevSerialized !== nextSerialized) {
        return true;
      }
    } catch (e) {
      return true;
    }
  }

  return false;
}