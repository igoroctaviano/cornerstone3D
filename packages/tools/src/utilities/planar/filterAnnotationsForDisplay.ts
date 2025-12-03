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
  const element = viewport.element as HTMLDivElement;
  const annotationDisplayMode = element?.dataset?.annotationDisplayMode;

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

    return result;
  }

  if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();

    const { spacingInNormalDirection } =
      csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);

    return filterAnnotationsWithinSlice(
      annotations,
      camera,
      spacingInNormalDirection
    );
  }

  if (
    annotationDisplayMode === 'frameOfReference' &&
    viewport instanceof StackViewport
  ) {
    const viewportFrameOfReferenceUID = viewport.getFrameOfReferenceUID();

    return annotations.filter((annotation) => {
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
  }

  if (viewport instanceof StackViewport) {
    const imageId = viewport.getCurrentImageId();

    if (!imageId) {
      return [];
    }

    const colonIndex = imageId.indexOf(':');
    filterOptions.imageURI = imageId.substring(colonIndex + 1);
  }

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
