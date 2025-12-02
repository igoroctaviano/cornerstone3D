import type { Types } from '@cornerstonejs/core';
import {
  StackViewport,
  VolumeViewport,
  utilities as csUtils,
} from '@cornerstonejs/core';

import filterAnnotationsWithinSlice from './filterAnnotationsWithinSlice';
import type { Annotations } from '../../types';

/**
 * Given the viewport and the annotations, it filters the annotations array and only
 * return those annotation that should be displayed on the viewport
 * @param annotations - Annotations
 * @returns A filtered version of the annotations.
 */
export default function filterAnnotationsForDisplay(
  viewport: Types.IViewport,
  annotations: Annotations,
  filterOptions: Types.ReferenceCompatibleOptions = {}
): Annotations {
  // Handle display set filtering mode (more restrictive - same series only)
  if (filterOptions.byDisplaySet) {
    // First filter by slice if it's a volume viewport
    let sliceFilteredAnnotations = annotations;
    if (viewport instanceof VolumeViewport) {
      const camera = viewport.getCamera();
      const { spacingInNormalDirection } =
        csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);
      sliceFilteredAnnotations = filterAnnotationsWithinSlice(
        annotations,
        camera,
        spacingInNormalDirection
      );
    }

    // Then filter by display set/series
    const result = sliceFilteredAnnotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }

      const annotationMetadata = annotation.metadata;

      // Match by series instance UID (most reliable for display set filtering)
      if (
        filterOptions.seriesInstanceUID &&
        annotationMetadata.seriesInstanceUID
      ) {
        return (
          annotationMetadata.seriesInstanceUID ===
          filterOptions.seriesInstanceUID
        );
      }

      // Fallback: match by display set UID if provided
      if (
        filterOptions.displaySetInstanceUID &&
        annotationMetadata.displaySetInstanceUID
      ) {
        return (
          annotationMetadata.displaySetInstanceUID ===
          filterOptions.displaySetInstanceUID
        );
      }

      // Fallback: match by referenced image (for stack viewports)
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

      // If no matching criteria found, don't show the annotation
      return false;
    });

    return result;
  }

  // Default: Frame of Reference filtering
  // For Volume viewports: filter by slice within the same frame of reference
  if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();

    const { spacingInNormalDirection } =
      csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);

    // Get data with same normal and within the same slice
    return filterAnnotationsWithinSlice(
      annotations,
      camera,
      spacingInNormalDirection
    );
  }

  // For Stack viewports in frame of reference mode:
  // Show annotations from ALL images that share the same frame of reference
  if (viewport instanceof StackViewport) {
    const viewportFrameOfReferenceUID = viewport.getFrameOfReferenceUID();

    // Filter by frame of reference - show all annotations that share the same FoR
    return annotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }
      if (annotation.data.isCanvasAnnotation) {
        return true;
      }

      // Check if annotation has the same frame of reference
      const annotationFrameOfReferenceUID =
        annotation.metadata?.FrameOfReferenceUID;
      return annotationFrameOfReferenceUID === viewportFrameOfReferenceUID;
    });
  }

  // Fallback: use isReferenceViewable (should not reach here for Stack/Volume viewports)
  return annotations.filter((annotation) => {
    if (!annotation.isVisible) {
      return false;
    }
    if (annotation.data.isCanvasAnnotation) {
      return true;
    }
    return viewport.isReferenceViewable(annotation.metadata, filterOptions);
  });
}
