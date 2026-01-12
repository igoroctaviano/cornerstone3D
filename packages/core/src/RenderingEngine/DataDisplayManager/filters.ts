import { dataDisplayManager } from './DataDisplayManager';
import type { IDataDisplayFilter } from './types';

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

function instantiateAnnotationFilter(options: any) {
  return {};
}

/**
 * Initialize the viewport filters
 */
export function initViewportFilters() {
  dataDisplayManager.registerSourceFilter(
    'viewportsSource',
    new ViewportListener()
  );

  dataDisplayManager.registerFilter(
    'viewportId',
    filterViewportById,
    'viewportsSource'
  );
}

/**
 * Initialize the annotations filters
 */
export function initAnnotationsFilters() {
  dataDisplayManager.registerSourceFilter(
    'annotationsSource',
    new AnnotationListener()
  );

  dataDisplayManager.registerFilter(
    'annotationsForViewport',
    annotationsForViewport,
    ['viewportsSource']
  );

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
