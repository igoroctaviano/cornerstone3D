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

    const filtered = annotations.filter((annotation) => {
      // Support both new groupIds array and legacy groupId string
      const annotationGroupIds =
        annotation.groupIds ||
        (annotation['groupId'] ? [annotation['groupId']] : ['default']);

      // Show annotation if ANY of its groups are visible
      return annotationGroupIds.some((groupId) =>
        visibleGroupIds.includes(groupId)
      );
    });
    return filtered;
  }

  return annotations;
}

export default function filterAnnotationsForDisplay(
  viewport: Types.IViewport,
  annotations: Annotations,
  filterOptions: Types.ReferenceCompatibleOptions = {}
): Annotations {
  const element = viewport.element as HTMLDivElement;
  const annotationDisplayMode = element?.dataset?.annotationDisplayMode;

  let filteredAnnotations: Annotations;

  if (annotationDisplayMode === 'displaySet') {
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

    const result = sliceFilteredAnnotations.filter((annotation) => {
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

    filteredAnnotations = result;
  } else if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();

    const { spacingInNormalDirection } =
      csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);

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

    filteredAnnotations = annotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }
      if (annotation.data.isCanvasAnnotation) {
        return true;
      }

      const annotationFrameOfReferenceUID =
        annotation.metadata?.FrameOfReferenceUID;
      return annotationFrameOfReferenceUID === viewportFrameOfReferenceUID;
    });
  } else {
    if (viewport instanceof StackViewport) {
      const imageId = viewport.getCurrentImageId();

      if (!imageId) {
        return [];
      }

      const colonIndex = imageId.indexOf(':');
      filterOptions.imageURI = imageId.substring(colonIndex + 1);
    }

    filteredAnnotations = annotations.filter((annotation) => {
      if (!annotation.isVisible) {
        return false;
      }
      if (annotation.data.isCanvasAnnotation) {
        return true;
      }
      return viewport.isReferenceViewable(annotation.metadata, filterOptions);
    });
  }

  return applyGroupFiltering(filteredAnnotations, element);
}
