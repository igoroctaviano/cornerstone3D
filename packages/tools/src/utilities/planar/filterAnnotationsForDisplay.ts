import type { Types } from '@cornerstonejs/core';
import {
  dataDisplayManager,
} from '@cornerstonejs/core';

import type { Annotations } from '../../types';

/**
 * Given the viewport, it filters the annotations and only
 * return those annotation that should be displayed on the viewport.
 * 
 * Annotations are automatically fetched from the AnnotationListener source
 * via the Data Display Manager. The annotations parameter is kept for backward
 * compatibility but is not used.
 * 
 * @param viewport - The viewport
 * @param annotations - Deprecated: kept for backward compatibility, not used
 * @param filterOptions - Filter options
 * @returns A filtered version of the annotations.
 */
export default function filterAnnotationsForDisplay(
  viewport: Types.IViewport,
  annotations?: Annotations,
  filterOptions: Types.ReferenceCompatibleOptions = {}
): Annotations {
  const result = dataDisplayManager.filterData('annotations', { viewportId: viewport.id });
  return result as Annotations;
}
