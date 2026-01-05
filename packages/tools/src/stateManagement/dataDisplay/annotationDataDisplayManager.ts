import type { Types } from '@cornerstonejs/core';
import {
  StackViewport,
  VolumeViewport,
  utilities as csUtils,
  metaData,
  cache,
} from '@cornerstonejs/core';

import type { Annotations } from '../../types';
import filterAnnotationsWithinSlice from '../../utilities/planar/filterAnnotationsWithinSlice';
import {
  createPipelineDataDisplayManager,
  getDataForDisplay,
  registerDataDisplayManager,
  registerDataDisplayManagerForViewport,
  registerFilter,
  setActiveDataDisplayManager,
  unregisterDataDisplayManager,
  unregisterDataDisplayManagerForViewport,
  unregisterFilterProvider,
} from './dataDisplayManager';
import type { IDataDisplayManager } from './dataDisplayManager';

export type AnnotationFilterProvider = (args: {
  viewport: Types.IViewport;
  annotations: Annotations;
  filterOptions?: Types.ReferenceCompatibleOptions;
}) => Annotations;

export type IAnnotationDataDisplayManager = IDataDisplayManager<Annotations>;

const ANNOTATIONS_DATA_TYPE = 'annotations';

/**
 * Register a named filter provider (name, fn) tuple.
 * These can be composed by a DataDisplayManager.
 * This follows the same pattern as metadata providers in cornerstone3d.
 */
export function registerAnnotationFilterProvider(
  name: string,
  fn: AnnotationFilterProvider
): void {
  registerFilter(ANNOTATIONS_DATA_TYPE, name, ({ viewport, data, filterOptions }) =>
    fn({
      viewport,
      annotations: data as Annotations,
      filterOptions,
    })
  );
}

export function unregisterAnnotationFilterProvider(name: string): boolean {
  return unregisterFilterProvider(ANNOTATIONS_DATA_TYPE, name);
}

export function registerAnnotationDataDisplayManager(
  name: string,
  manager: IAnnotationDataDisplayManager
): void {
  registerDataDisplayManager(ANNOTATIONS_DATA_TYPE, name, manager);
}

export function unregisterAnnotationDataDisplayManager(name: string): boolean {
  return unregisterDataDisplayManager(ANNOTATIONS_DATA_TYPE, name);
}

/**
 * Sets the default (global) DataDisplayManager for annotations.
 * Users can override per viewport via registerAnnotationDataDisplayManagerForViewport.
 */
export function setActiveAnnotationDataDisplayManager(name: string): void {
  setActiveDataDisplayManager(ANNOTATIONS_DATA_TYPE, name);
}

/**
 * Assign a DataDisplayManager to a specific viewport (by viewportId).
 * If not set, the global default manager is used.
 */
export function registerAnnotationDataDisplayManagerForViewport(
  viewportId: string,
  dataDisplayManagerName: string
): void {
  registerDataDisplayManagerForViewport(
    viewportId,
    ANNOTATIONS_DATA_TYPE,
    dataDisplayManagerName
  );
}

export function unregisterAnnotationDataDisplayManagerForViewport(
  viewportId: string
): void {
  unregisterDataDisplayManagerForViewport(
    viewportId,
    ANNOTATIONS_DATA_TYPE
  );
}

/**
 * Main entry-point: given a viewport + annotation list, return the annotations
 * that should be displayed on that viewport.
 */
export function getAnnotationsForDisplay(
  viewport: Types.IViewport,
  annotations: Annotations,
  filterOptions: Types.ReferenceCompatibleOptions = {}
): Annotations {
  return getDataForDisplay<Annotations>(
    ANNOTATIONS_DATA_TYPE,
    viewport,
    annotations,
    filterOptions
  );
}

/**
 * Convenience factory for creating a manager that composes named filter providers.
 * Useful for apps that want to build a manager from registered filter names.
 */
export function createAnnotationPipelineDataDisplayManager(
  name: string,
  filterProviderNames: string[]
): IAnnotationDataDisplayManager {
  return createPipelineDataDisplayManager<Annotations>(
    ANNOTATIONS_DATA_TYPE,
    name,
    filterProviderNames
  );
}

function applyGroupFiltering(
  annotations: Annotations,
  element: HTMLDivElement
): Annotations {
  const visibleGroupIdsStr = element?.dataset?.visibleAnnotationGroups;

  if (visibleGroupIdsStr !== undefined) {
    const visibleGroupIds = visibleGroupIdsStr.split(',').filter(Boolean);

    if (visibleGroupIds.length === 0) {
      return [];
    }

    return annotations.filter((annotation) => {
      const annotationGroupIds = annotation.groupIds || ['default'];
      return annotationGroupIds.some((groupId) => visibleGroupIds.includes(groupId));
    });
  }

  return annotations;
}

/**
 * Default filter: Preserves current `filterAnnotationsForDisplay` behavior for backward compatibility.
 * This extracts the entire current filtering logic so existing functionality continues to work.
 * Users can then change to other filters (bySelectorId, byFrameOfReference, etc.) as needed.
 */
function defaultFilterProvider({
  viewport,
  annotations,
  filterOptions = {},
}: {
  viewport: Types.IViewport;
  annotations: Annotations;
  filterOptions?: Types.ReferenceCompatibleOptions;
}): Annotations {
  const element = viewport.element as HTMLDivElement;
  const annotationDisplayMode = element?.dataset?.annotationDisplayMode;

  let filteredAnnotations: Annotations;

  if (annotationDisplayMode === 'displaySet') {
    let sliceFilteredAnnotations = annotations;
    if (viewport instanceof VolumeViewport) {
      const camera = viewport.getCamera();
      const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(
        viewport,
        camera
      );
      sliceFilteredAnnotations = filterAnnotationsWithinSlice(
        annotations,
        camera,
        spacingInNormalDirection
      );
    }

    filteredAnnotations = sliceFilteredAnnotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }

      const annotationMetadata = annotation.metadata;

      if (annotationMetadata.referencedImageId) {
        if (viewport instanceof StackViewport) {
          const currentImageId = viewport.getCurrentImageId();
          if (!currentImageId) {
            return false;
          }

          const imageURI = csUtils.imageIdToURI(currentImageId);
          const annotationImageURI =
            annotationMetadata.referencedImageURI ||
            csUtils.imageIdToURI(annotationMetadata.referencedImageId);

          return imageURI === annotationImageURI;
        }
      }

      return false;
    });
  } else if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();
    const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(
      viewport,
      camera
    );

    filteredAnnotations = filterAnnotationsWithinSlice(
      annotations,
      camera,
      spacingInNormalDirection
    );
  } else if (
    annotationDisplayMode === 'frameOfReference' &&
    viewport instanceof StackViewport
  ) {
    const viewportFrameOfReferenceUID = viewport.getFrameOfReferenceUID();
    const camera = viewport.getCamera();

    filteredAnnotations = annotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }
      if (annotation.data.isCanvasAnnotation) {
        return true;
      }

      const annotationFrameOfReferenceUID = annotation.metadata?.FrameOfReferenceUID;
      return annotationFrameOfReferenceUID === viewportFrameOfReferenceUID;
    });

    const currentImageId = viewport.getCurrentImageId();
    if (!currentImageId) {
      return [];
    }

    const imagePlaneModule = metaData.get('imagePlaneModule', currentImageId);
    const spacingInNormalDirection =
      imagePlaneModule?.spacingBetweenSlices ||
      imagePlaneModule?.sliceThickness ||
      1;

    filteredAnnotations = filterAnnotationsWithinSlice(
      filteredAnnotations,
      camera,
      spacingInNormalDirection
    );
  } else {
    const options = { ...filterOptions };

    if (viewport instanceof StackViewport) {
      const imageId = viewport.getCurrentImageId();

      if (!imageId) {
        return [];
      }

      const colonIndex = imageId.indexOf(':');
      options.imageURI = imageId.substring(colonIndex + 1);
    }

    filteredAnnotations = annotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }
      if (annotation.data.isCanvasAnnotation) {
        return true;
      }
      return viewport.isReferenceViewable(annotation.metadata, options);
    });
  }

  return filteredAnnotations;
}

/**
 * Filters annotations based on selector IDs (e.g., groupIds).
 * This allows filtering by annotation groups or other selector-based groupings.
 */
function bySelectorIdFilterProvider({
  viewport,
  annotations,
}: {
  viewport: Types.IViewport;
  annotations: Annotations;
}): Annotations {
  const element = viewport.element as HTMLDivElement;
  return applyGroupFiltering(annotations, element);
}

/**
 * Filters annotations by strict referencedImageId matching - only show annotations
 * from the same viewport image data (display set).
 * For VolumeViewports, checks if annotation's referencedImageId is in the volume's imageIds.
 * For StackViewports, compares with current imageId.
 */
function byReferenceImageIdFilterProvider({
  viewport,
  annotations,
}: {
  viewport: Types.IViewport;
  annotations: Annotations;
}): Annotations {
  let sliceFilteredAnnotations = annotations;

  // For volume viewports, keep slice filtering so we don't show annotations
  // far away from the current slab.
  if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();
    const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(
      viewport,
      camera
    );
    sliceFilteredAnnotations = filterAnnotationsWithinSlice(
      annotations,
      camera,
      spacingInNormalDirection
    );
  }

  // For VolumeViewports, check if annotation's referencedImageId is in the volume's imageIds
  if (viewport instanceof VolumeViewport) {
    const volumeId = viewport.getVolumeId();
    if (volumeId) {
      const volume = cache.getVolume(volumeId);
      if (volume) {
        const volumeImageIds = volume.imageIds || [];
        const volumeImageURIs = new Set(
          volumeImageIds.map((id) => csUtils.imageIdToURI(id))
        );

        return sliceFilteredAnnotations.filter((annotation) => {
          if (!annotation.isVisible) {
            return false;
          }
          if (annotation.data.isCanvasAnnotation) {
            return true;
          }

          const { referencedImageId, referencedImageURI } = annotation.metadata || {};
          if (!referencedImageId) {
            return false;
          }

          const annotationImageURI =
            referencedImageURI || csUtils.imageIdToURI(referencedImageId);
          return volumeImageURIs.has(annotationImageURI);
        });
      }
    }
  }

  // For StackViewports, compare with current imageId
  const currentImageId =
    (viewport as unknown as { getCurrentImageId?: () => string | undefined })
      .getCurrentImageId?.() || undefined;

  const currentImageURI = currentImageId
    ? csUtils.imageIdToURI(currentImageId)
    : undefined;

  return sliceFilteredAnnotations.filter((annotation) => {
    if (!annotation.isVisible) {
      return false;
    }
    if (annotation.data.isCanvasAnnotation) {
      return true;
    }

    const { referencedImageId, referencedImageURI } = annotation.metadata || {};
    if (!referencedImageId || !currentImageURI) {
      return false;
    }

    const annotationImageURI = referencedImageURI || csUtils.imageIdToURI(referencedImageId);
    return annotationImageURI === currentImageURI;
  });
}

/**
 * Filters annotations by Frame of Reference (FOR) - shows annotations from the same FOR
 * with in-slice filtering for volume viewports.
 */
function byFrameOfReferenceFilterProvider({
  viewport,
  annotations,
}: {
  viewport: Types.IViewport;
  annotations: Annotations;
}): Annotations {
  const viewportFrameOfReferenceUID =
    (viewport as unknown as { getFrameOfReferenceUID?: () => string | undefined })
      .getFrameOfReferenceUID?.() || undefined;

  if (!viewportFrameOfReferenceUID) {
    return [];
  }

  let filtered = annotations.filter((annotation) => {
    if (!annotation.isVisible) {
      return false;
    }
    if (annotation.data.isCanvasAnnotation) {
      return true;
    }
    return annotation.metadata?.FrameOfReferenceUID === viewportFrameOfReferenceUID;
  });

  // Apply in-slice filtering to avoid showing out-of-plane annotations.
  if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();
    const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(
      viewport,
      camera
    );
    filtered = filterAnnotationsWithinSlice(filtered, camera, spacingInNormalDirection);
    return filtered;
  }

  if (viewport instanceof StackViewport) {
    const currentImageId = viewport.getCurrentImageId();
    if (!currentImageId) {
      return [];
    }
    const camera = viewport.getCamera();
    const imagePlaneModule = metaData.get('imagePlaneModule', currentImageId);
    const spacingInNormalDirection =
      imagePlaneModule?.spacingBetweenSlices ||
      imagePlaneModule?.sliceThickness ||
      1;

    filtered = filterAnnotationsWithinSlice(filtered, camera, spacingInNormalDirection);
  }

  return filtered;
}

/**
 * Forced mode provider: "default" behavior regardless of element.dataset.
 * This uses `viewport.isReferenceViewable` with the standard guards.
 */
function referenceViewableModeFilterProvider({
  viewport,
  annotations,
  filterOptions = {},
}: {
  viewport: Types.IViewport;
  annotations: Annotations;
  filterOptions?: Types.ReferenceCompatibleOptions;
}): Annotations {
  const options = { ...filterOptions };

  if (viewport instanceof StackViewport) {
    const imageId = viewport.getCurrentImageId();
    if (!imageId) {
      return [];
    }
    const colonIndex = imageId.indexOf(':');
    options.imageURI = imageId.substring(colonIndex + 1);
  }

  return annotations.filter((annotation) => {
    if (!annotation.isVisible) {
      return false;
    }
    if (annotation.data.isCanvasAnnotation) {
      return true;
    }
    return viewport.isReferenceViewable(annotation.metadata, options);
  });
}

/**
 * Filters annotations by time/dimension group for 4D volumes.
 * Only applies to volume viewports with dynamic volumes.
 * Annotations should have metadata.dimensionGroupNumber to be filtered by this provider.
 * The volume's activeDimensionGroup tells you which timepoint is currently active.
 */
function byTimeFilterProvider({
  viewport,
  annotations,
}: {
  viewport: Types.IViewport;
  annotations: Annotations;
}): Annotations {
  // Only applies to volume viewports
  if (!(viewport instanceof VolumeViewport)) {
    return annotations;
  }

  // Get the volume ID from the viewport
  const volumeId = (viewport as VolumeViewport).getVolumeId?.();
  if (!volumeId) {
    return annotations;
  }

  // Get the volume and check if it's a dynamic volume
  const volume = cache.getVolume(volumeId);
  if (!volume || typeof (volume as any).dimensionGroupNumber === 'undefined') {
    // Not a dynamic volume, return all annotations
    return annotations;
  }

  const dynamicVolume = volume as Types.IDynamicImageVolume;
  const currentDimensionGroup = dynamicVolume.dimensionGroupNumber;

  // Filter annotations based on dimension group
  return annotations.filter((annotation) => {
    if (!annotation.isVisible) {
      return false;
    }
    if (annotation.data.isCanvasAnnotation) {
      return true;
    }

    // The new default should be specific time (not all time).
    // If annotation doesn't have dimensionGroupNumber metadata, don't show it
    // (default to specific time behavior).
    const metadata = annotation.metadata as any;
    const annotationDimensionGroup = metadata?.dimensionGroupNumber;
    if (annotationDimensionGroup === undefined) {
      return false;
    }

    // Show annotation only if it matches the current dimension group (specific time)
    return annotationDimensionGroup === currentDimensionGroup;
  });
}

// ---- defaults (registered on import) ----
// Register built-in filter providers
registerAnnotationFilterProvider('default', defaultFilterProvider);
registerAnnotationFilterProvider('bySelectorId', bySelectorIdFilterProvider);
registerAnnotationFilterProvider('byReferenceImageId', byReferenceImageIdFilterProvider);
registerAnnotationFilterProvider('byFrameOfReference', byFrameOfReferenceFilterProvider);
registerAnnotationFilterProvider('byTime', byTimeFilterProvider);
registerAnnotationFilterProvider('referenceViewable', referenceViewableModeFilterProvider);

// Register default manager (preserves current behavior)
registerAnnotationDataDisplayManager(
  'default',
  createAnnotationPipelineDataDisplayManager('default', ['default', 'bySelectorId'])
);

// Built-in managers for common use cases
registerAnnotationDataDisplayManager(
  'byReferenceImageId',
  createAnnotationPipelineDataDisplayManager('byReferenceImageId', [
    'byReferenceImageId',
    'bySelectorId',
  ])
);
registerAnnotationDataDisplayManager(
  'byFrameOfReference',
  createAnnotationPipelineDataDisplayManager('byFrameOfReference', [
    'byFrameOfReference',
    'bySelectorId',
  ])
);
registerAnnotationDataDisplayManager(
  'bySelectorId',
  createAnnotationPipelineDataDisplayManager('bySelectorId', ['default', 'bySelectorId'])
);

