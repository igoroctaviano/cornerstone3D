import { dataDisplayManager } from './DataDisplayManager';
import type { IDataDisplayFilter } from './types';
import StackViewport from '../StackViewport';
import VolumeViewport from '../VolumeViewport';
import type { IViewport } from '../../types';
import * as csUtils from '../../utilities';
import { getEnabledElementByViewportId } from '../../getEnabledElement';
import { utilities as csToolsUtilities } from '@cornerstonejs/tools';

import { ViewportListener } from './ViewportListener';
import { AnnotationListener } from './AnnotationListener';

function filterViewportById(viewportId: string): IDataDisplayFilter {
  return {
    filter: (...args: any[]) => true,
  };
}

function annotationsForViewport(viewportId: string): IDataDisplayFilter {
  return {
    filter: (...args: any[]) => true,
  };
}

function filterAnnotationsForDisplay(dependsOn: any): IDataDisplayFilter {
  const { viewportId } = dependsOn;

  const enabledElement = getEnabledElementByViewportId(viewportId);
  if (!enabledElement || !enabledElement.viewport) {
    return {
      filter: () => false,
    };
  }
  const viewport = enabledElement.viewport as IViewport;

  if (viewport instanceof VolumeViewport) {
    const camera = viewport.getCamera();
    const { spacingInNormalDirection } =
      csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);
    return {
      filter: (annotation: any) => {
        const filteredAnnotations =
          csToolsUtilities.planar.filterAnnotationsWithinSlice(
            [annotation],
            camera,
            spacingInNormalDirection
          );
        return filteredAnnotations.length > 0;
      },
    };
  }

  if (viewport instanceof StackViewport) {
    const imageId = viewport.getCurrentImageId();
    if (!imageId) {
      return {
        filter: () => false,
      };
    }

    const colonIndex = imageId.indexOf(':');
    const imageURI = imageId.substring(colonIndex + 1);
    const options = { imageURI };

    return {
      filter: (annotation: any) => {
        if (!annotation.isVisible) {
          return false;
        }

        if (annotation.data?.isCanvasAnnotation) {
          return true;
        }

        return viewport.isReferenceViewable(annotation.metadata, options);
      },
    };
  }

  return {
    filter: () => false,
  };
}

/**
 * Initialize the viewport filters
 */
export function initViewportDataDisplayFilters() {
  const viewportsSourceId = 'viewports';
  dataDisplayManager.registerSource(
    viewportsSourceId,
    new ViewportListener(viewportsSourceId)
  );

  dataDisplayManager.registerFilter('viewportId', filterViewportById, {
    sourceId: viewportsSourceId,
    dependsOn: [viewportsSourceId],
  });
}

/**
 * Initialize the annotations filters
 */
export function initAnnotationsDataDisplayFilters() {
  const annotationsSourceId = 'annotations';
  dataDisplayManager.registerSource(
    annotationsSourceId,
    new AnnotationListener(annotationsSourceId)
  );

  dataDisplayManager.registerFilter(
    'filterAnnotationsForDisplay' /** Same name as the source filter id for now */,
    filterAnnotationsForDisplay,
    { sourceId: annotationsSourceId, dependsOn: ['viewports'] }
  );
}
