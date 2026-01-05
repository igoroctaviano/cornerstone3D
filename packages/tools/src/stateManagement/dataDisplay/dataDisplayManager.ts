import type { Types } from '@cornerstonejs/core';
import { state as toolsState } from '../../store/state';

/**
 * Generic DataDisplayManager plumbing that supports any data type
 * (annotations, segmentations, overlays, etc). Each data type has:
 *  - Filter providers (name, fn)
 *  - Managers (name, pipeline that may call providers)
 *  - Global active manager (per data type)
 *  - Per-viewport active manager override (per data type)
 */

export type DataDisplayFilterProvider<TData = unknown> = (args: {
  viewport: Types.IViewport;
  data: TData;
  filterOptions?: Types.ReferenceCompatibleOptions;
}) => TData;

export interface IDataDisplayManager<TData = unknown> {
  name: string;
  getDataForDisplay(args: {
    viewport: Types.IViewport;
    data: TData;
    filterOptions?: Types.ReferenceCompatibleOptions;
  }): TData;
}

type ProviderMap = Map<string, DataDisplayFilterProvider>;
type ManagerMap = Map<string, IDataDisplayManager>;

const filterProvidersRegistry = new Map<string, ProviderMap>();
const dataDisplayManagersRegistry = new Map<string, ManagerMap>();

function getProviderMap(dataType: string): ProviderMap {
  if (!filterProvidersRegistry.has(dataType)) {
    filterProvidersRegistry.set(dataType, new Map());
  }
  return filterProvidersRegistry.get(dataType);
}

function getManagerMap(dataType: string): ManagerMap {
  if (!dataDisplayManagersRegistry.has(dataType)) {
    dataDisplayManagersRegistry.set(dataType, new Map());
  }
  return dataDisplayManagersRegistry.get(dataType);
}

/**
 * Register a filter function for a given data type.
 * This is the same as the metadata provider pattern in cornerstone3d.
 * @param dataType - The data type (e.g., 'annotations', 'segmentations')
 * @param name - The filter name (e.g., 'byFrameOfReference', 'byTime', 'bySelectorId')
 * @param fn - The filter function
 */
export function registerFilter(
  dataType: string,
  name: string,
  fn: DataDisplayFilterProvider
): void {
  getProviderMap(dataType).set(name, fn);
}

export function unregisterFilterProvider(
  dataType: string,
  name: string
): boolean {
  return getProviderMap(dataType).delete(name);
}

export function registerDataDisplayManager(
  dataType: string,
  name: string,
  manager: IDataDisplayManager
): void {
  getManagerMap(dataType).set(name, manager);
}

export function unregisterDataDisplayManager(
  dataType: string,
  name: string
): boolean {
  return getManagerMap(dataType).delete(name);
}

export function getDataDisplayManager(
  dataType: string,
  name: string
): IDataDisplayManager | undefined {
  return getManagerMap(dataType).get(name);
}

export function setActiveDataDisplayManager(
  dataType: string,
  name: string
): void {
  toolsState.activeDataDisplayManagers[dataType] = name;
}

export function getActiveDataDisplayManagerName(dataType: string): string {
  const active = toolsState.activeDataDisplayManagers?.[dataType];
  return active || 'default';
}

export function registerDataDisplayManagerForViewport(
  viewportId: string,
  dataType: string,
  dataDisplayManagerName: string
): void {
  toolsState.viewportDataDisplayManagers[viewportId] ||= {};
  toolsState.viewportDataDisplayManagers[viewportId][dataType] =
    dataDisplayManagerName;
}

export function unregisterDataDisplayManagerForViewport(
  viewportId: string,
  dataType: string
): void {
  const entry = toolsState.viewportDataDisplayManagers?.[viewportId];
  if (!entry) {
    return;
  }
  delete entry[dataType];
  if (Object.keys(entry).length === 0) {
    delete toolsState.viewportDataDisplayManagers[viewportId];
  }
}

/**
 * Clean up all data display manager registrations for a given viewport.
 * This removes all per-viewport overrides for all data types.
 * @param viewportId - The viewport ID to clean up
 */
export function cleanAllDataDisplayManagersForViewport(viewportId: string): void {
  delete toolsState.viewportDataDisplayManagers[viewportId];
}

function getConfiguredDataDisplayManagerName(
  dataType: string,
  viewportId?: string
): string {
  const perViewport =
    viewportId &&
    toolsState.viewportDataDisplayManagers?.[viewportId]?.[dataType];

  return perViewport || getActiveDataDisplayManagerName(dataType);
}

export function getDataForDisplay<TData>(
  dataType: string,
  viewport: Types.IViewport,
  data: TData,
  filterOptions: Types.ReferenceCompatibleOptions = {}
): TData {
  const managerName = getConfiguredDataDisplayManagerName(dataType, viewport?.id);
  const manager =
    getManagerMap(dataType).get(managerName) ||
    getManagerMap(dataType).get('default');

  if (!manager) {
    return data as TData;
  }

  return (manager as IDataDisplayManager<TData>).getDataForDisplay({
    viewport,
    data,
    filterOptions,
  });
}

/**
 * Check if data is viewable on a viewport by viewport ID.
 * This is a convenience method that accepts viewportId instead of viewport object.
 * The data display manager knows which viewport has which filter and comes up with
 * an array of data that is viewable on this viewport.
 * 
 * @param dataType - The data type (e.g., 'annotations', 'segmentations')
 * @param viewportId - The viewport ID
 * @param data - The data to check
 * @param filterOptions - Optional filter options
 * @returns Filtered data that is viewable on the viewport
 */
export function isViewable<TData>(
  dataType: string,
  viewportId: string,
  data: TData,
  filterOptions: Types.ReferenceCompatibleOptions = {}
): TData {
  // Import here to avoid circular dependencies
  const { getRenderingEngines } = require('@cornerstonejs/core');
  
  // Search through all rendering engines to find the viewport
  const renderingEngines = getRenderingEngines();
  
  for (const renderingEngine of renderingEngines) {
    const viewport = renderingEngine.getViewport(viewportId);
    if (viewport) {
      return getDataForDisplay(dataType, viewport, data, filterOptions);
    }
  }
  
  // If viewport not found, return empty array (no data is viewable)
  return [] as unknown as TData;
}

/**
 * Helper to create a pipeline manager using provider names for a given data type.
 */
export function createPipelineDataDisplayManager<TData>(
  dataType: string,
  name: string,
  filterProviderNames: string[]
): IDataDisplayManager<TData> {
  const providers = getProviderMap(dataType);

  return {
    name,
    getDataForDisplay: ({ viewport, data, filterOptions }) => {
      let result = data;
      for (const providerName of filterProviderNames) {
        const provider = providers.get(providerName);
        if (!provider) {
          continue;
        }
        result = provider({
          viewport,
          data: result,
          filterOptions,
        }) as TData;
      }
      return result;
    },
  };
}

