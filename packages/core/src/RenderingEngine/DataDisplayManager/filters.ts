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

function instantiateAnnotationFilter(dependencies: any): IDataDisplayFilter {
  const { viewportId } = dependencies;

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
  dataDisplayManager.registerSourceFilter('viewports', new ViewportListener());

  dataDisplayManager.registerFilter(
    'viewportId',
    filterViewportById,
    'viewportsSource'
  );
}

/**
 * Initialize the annotations filters
 */
export function initAnnotationsDataDisplayFilters() {
  dataDisplayManager.registerSourceFilter(
    'annotations',
    new AnnotationListener()
  );

  // dataDisplayManager.registerFilter(
  //   'annotationsForViewport',
  //   annotationsForViewport,
  //   ['viewports'] // a string that identifies a source filter (if source filter changes then updates)
  // );

  // registerDataSource matches createFilterInstance
  // instantiateAnnotationFilter is the full set of filters that it depends on and so this thing matches createFilterInstance
  // this one creates the full filter chain
  dataDisplayManager.registerDataSource(
    'annotations',
    instantiateAnnotationFilter
  );
}

// Example 1 of Cornerstone3D'S filterAnnotationsForDisplay modified to
// use the new data display manager todo the annotations's filtering
//
// export function filterAnnotationsForDisplay(viewportId: string) {
//   const filter = dataDisplayManager.createFilterInstance('annotations', viewportId);
//   return filter.getData();
// }

// Example 2 (encapsulate logic) of Cornerstone3D'S filterAnnotationsForDisplay modified to
// use the new data display manager todo the annotations's filtering
//
// export function filterAnnotationsForDisplay(viewportId: string) {
//   return dataDisplayManager.filterData('annotations', {
//     viewportId,
//     showByFOR: true,
//   });
// }

// Example of a React component that uses the data display manager through a hook
//
// export function ReactComponent({ viewportId, showByFOR }: { viewportId: string, showByFOR: boolean }) {
//   const annotations = dataDisplayManager.useFilterData('annotations', {
//     viewportId, // The viewportId being passed here is just for dependencies meaning that if it changes then useFilterData should get fresh annotations / rerun the filters
//     showByFOR,
//   });
//
//   return <div>Annotations: {annotations.length}</div>;
// }
