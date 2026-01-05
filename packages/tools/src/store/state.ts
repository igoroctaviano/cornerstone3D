import type { IAnnotationManager, IToolGroup, IToolClassReference } from '../types';
import type Synchronizer from './SynchronizerManager/Synchronizer';
import svgNodeCache, { resetSvgNodeCache } from './svgNodeCache';

interface ICornerstoneTools3dState {
  isInteractingWithTool: boolean;
  isMultiPartToolActive: boolean;
  /**
   * Registry of annotation managers available to the app (e.g. per-mode).
   * Users can swap which manager is active by changing `activeAnnotationManager`.
   */
  annotationManagers: Record<string, IAnnotationManager>;
  /**
   * Key into `annotationManagers` to choose which annotation manager to use.
   * Default is "DEFAULT".
   */
  activeAnnotationManager: string;
  /**
   * Active DataDisplayManager name per data type (annotations, segmentations, ...).
   * Start with annotations.
   */
  activeDataDisplayManagers: Record<string, string>;
  /**
   * Per viewport override of active DataDisplayManager per data type.
   * Example: viewportDataDisplayManagers[viewportId].annotations = 'grouping'
   */
  viewportDataDisplayManagers: Record<string, Record<string, string>>;
  tools: Record<
    string,
    {
      toolClass: IToolClassReference;
    }
  >;
  toolGroups: Array<IToolGroup>;
  synchronizers: Array<Synchronizer>;
  svgNodeCache: Record<string, unknown>;
  enabledElements: Array<unknown>;
  handleRadius: number;
}

const defaultState: ICornerstoneTools3dState = {
  isInteractingWithTool: false,
  isMultiPartToolActive: false,
  annotationManagers: {},
  activeAnnotationManager: 'DEFAULT',
  activeDataDisplayManagers: {
    annotations: 'default',
  },
  viewportDataDisplayManagers: {},
  tools: {},
  toolGroups: [],
  synchronizers: [],
  svgNodeCache: svgNodeCache,
  // Should this be named... canvases?
  enabledElements: [], // switch to Uids?
  handleRadius: 6,
};

let state: ICornerstoneTools3dState = {
  isInteractingWithTool: false,
  isMultiPartToolActive: false,
  annotationManagers: {},
  activeAnnotationManager: 'DEFAULT',
  activeDataDisplayManagers: {
    annotations: 'default',
  },
  viewportDataDisplayManagers: {},
  tools: {},
  toolGroups: [],
  synchronizers: [],
  svgNodeCache: svgNodeCache,
  // Should this be named... canvases?
  enabledElements: [], // switch to Uids?
  handleRadius: 6,
};

function resetCornerstoneToolsState(): void {
  resetSvgNodeCache();
  state = {
    ...structuredClone({
      ...defaultState,
      svgNodeCache: {},
    }),
    svgNodeCache: {
      ...defaultState.svgNodeCache,
    },
  };
}

export type { ICornerstoneTools3dState };
export { resetCornerstoneToolsState, state, state as default };
