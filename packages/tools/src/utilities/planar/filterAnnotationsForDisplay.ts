import type { Types } from '@cornerstonejs/core';
import type { Annotations } from '../../types';
import { getAnnotationsForDisplay } from '../../stateManagement/dataDisplay/annotationDataDisplayManager';

/**
 * Backwards-compatible wrapper around the new `DataDisplayManager` concept.
 *
 * The core team direction is to treat "what data is viewable on a viewport"
 * as a configurable manager + filter-provider pipeline (annotations first, then
 * extend to other data types like segmentations/contours).
 */
export default function filterAnnotationsForDisplay(
  viewport: Types.IViewport,
  annotations: Annotations,
  filterOptions: Types.ReferenceCompatibleOptions = {}
): Annotations {
  return getAnnotationsForDisplay(viewport, annotations, filterOptions);
}
