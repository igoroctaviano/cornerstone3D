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
    console.log('[filterAnnotationsForDisplay] byDisplaySet mode activated', {
      displaySetUID: filterOptions.displaySetInstanceUID,
      seriesUID: filterOptions.seriesInstanceUID,
    });

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
      console.log(
        `[filterAnnotationsForDisplay] After slice filter: ${sliceFilteredAnnotations.length} annotations`
      );
    }

    // Then filter by display set/series
    const result = sliceFilteredAnnotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }

      const annotationMetadata = annotation.metadata;

      console.log('[filterAnnotationsForDisplay] Checking annotation', {
        annotationSeriesUID: annotationMetadata.seriesInstanceUID,
        viewportSeriesUID: filterOptions.seriesInstanceUID,
        match:
          annotationMetadata.seriesInstanceUID ===
          filterOptions.seriesInstanceUID,
      });

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

    console.log(
      `[filterAnnotationsForDisplay] Final result: ${result.length} annotations`
    );
    return result;
  }

  // Default: Frame of Reference filtering
  // For Volume viewports: filter by slice within the same frame of reference
  if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();

    const { spacingInNormalDirection } =
      csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);

    // Get data with same normal and within the same slice
    const sliceFilteredAnnotations = filterAnnotationsWithinSlice(
      annotations,
      camera,
      spacingInNormalDirection
    );

    console.log(
      '[filterAnnotationsForDisplay] Frame of reference mode (volume)',
      {
        totalAnnotations: annotations.length,
        afterSliceFilter: sliceFilteredAnnotations.length,
      }
    );

    return sliceFilteredAnnotations;
  }

  // For Stack viewports in frame of reference mode:
  // Show annotations from ALL images that share the same frame of reference
  if (viewport instanceof StackViewport) {
    console.log(
      '[filterAnnotationsForDisplay] Frame of reference mode (stack)',
      {
        totalAnnotations: annotations.length,
      }
    );

    const viewportFrameOfReferenceUID = viewport.getFrameOfReferenceUID();
    console.log(
      '[filterAnnotationsForDisplay] Viewport FoR UID:',
      viewportFrameOfReferenceUID
    );

    // Filter by frame of reference - show all annotations that share the same FoR
    const filtered = annotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }
      if (annotation.data.isCanvasAnnotation) {
        return true;
      }

      // Check if annotation has the same frame of reference
      const annotationFrameOfReferenceUID =
        annotation.metadata?.FrameOfReferenceUID;
      const match =
        annotationFrameOfReferenceUID === viewportFrameOfReferenceUID;

      console.log('[filterAnnotationsForDisplay] Annotation check:', {
        annotationFoR: annotationFrameOfReferenceUID,
        viewportFoR: viewportFrameOfReferenceUID,
        match,
        seriesUID: annotation.metadata?.seriesInstanceUID,
      });

      return match;
    });

    console.log(
      `[filterAnnotationsForDisplay] Frame of reference mode, Final result: ${filtered.length} annotations`
    );
    return filtered;
  }

  // Fallback: use isReferenceViewable (should not reach here for Stack/Volume viewports)
  console.log('[filterAnnotationsForDisplay] Fallback to isReferenceViewable');
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
