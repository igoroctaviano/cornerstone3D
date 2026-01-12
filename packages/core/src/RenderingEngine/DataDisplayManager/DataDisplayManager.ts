import type { IDataDisplayFilterFactory, IDataDisplaySource } from './types';
import { createCacheKey } from './utils';

export class DataDisplayManager {
  private sources = new Map<string, IDataDisplaySource<any>>();
  private filters = new Map<string, any>();
  private dataSources = new Map<string, any>();
  private filterInstances = new Map<string, any>();
  private initializedSources = new Map<string, Map<string, any>>();

  /**
   * This is the basic source of all data for displaying
   *
   * @param id
   * @param source
   */
  public registerSourceFilter(id: string, source: IDataDisplaySource<any>) {
    this.sources.set(id, source);
  }

  /**
   * This is the basic filter of all data for displaying
   *
   * @param id
   * @param filter
   * @param dependencies
   */
  public registerFilter(
    id: string,
    filter: IDataDisplayFilterFactory,
    ...dependencies: any[]
  ) {
    this.filters.set(id, { filter, dependencies });
  }

  /**
   * Creates a filter instance tied to dependencies (like viewportId).
   * The instance is reactive - it will re-run when dependencies change or when
   * the source data changes.
   *
   * Can be used with:
   * - Individual registered filters (id like 'annotationsForViewport')
   * - Data sources (id like 'annotations') - returns instance with getData() method
   *
   * @param id - The filter ID or data source ID
   * @param dependencies - Dependencies that the filter is tied to (e.g., { viewportId, viewport, filterOptions })
   * @returns Filter instance (for data sources, includes getData() method)
   */
  public createFilterInstance(id: string, dependencies: any) {
    /** Filter chain */
    const instantiateFn = this.dataSources.get(id);
    if (instantiateFn) {
      const filterChain = instantiateFn(dependencies);
      const key = createCacheKey(id, dependencies);
      const instance = {
        filter: filterChain,
        dependencies,
        getData: () => this._applyFilterChain(id, filterChain),
      };
      this.filterInstances.set(key, instance);
      return instance;
    }

    /** Individual filter */
    const filterConfig = this.filters.get(id);
    if (!filterConfig) {
      return null;
    }
    const filterInstance = filterConfig.filter(dependencies);
    const key = createCacheKey(id, dependencies);
    this.filterInstances.set(key, filterInstance);
    return filterInstance;
  }

  /**
   * Internal method to apply filter chain to data from source
   */
  private _applyFilterChain(id: string, filterChain: any) {
    const source = this.sources.get(id);
    if (!source) {
      return [];
    }

    if (!this.initializedSources.has(id)) {
      const dataMap = source.init(
        () => {},
        () => {},
        () => {}
      );
      this.initializedSources.set(id, dataMap);
    }

    const dataMap = this.initializedSources.get(id);
    if (!dataMap) {
      return [];
    }

    const dataArray = Array.from(dataMap.values());

    if (!filterChain) {
      return dataArray;
    }

    if (filterChain.filter && typeof filterChain.filter === 'function') {
      return dataArray.filter((item) => filterChain.filter(item));
    }

    if (Array.isArray(filterChain)) {
      return dataArray.filter((item) => {
        return filterChain.every((filter) => filter.filter(item));
      });
    }

    return [];
  }

  public registerDataSource(id: string, instantiateFn: any) {
    this.dataSources.set(id, instantiateFn);
  }

  /**
   * High-level convenience method that abstracts createFilterInstance + getData().
   * Creates a filter instance tied to dependencies and immediately returns filtered data.
   *
   * This is equivalent to:
   *   const instance = createFilterInstance(id, dependencies);
   *   return instance.getData();
   *
   * @param id - The data source ID (e.g., 'annotations')
   * @param dependencies - Dependencies that the filter is tied to
   * @returns Filtered data array
   */
  public filterData(id: string, dependencies: any) {
    const instance = this.createFilterInstance(id, dependencies);
    if (!instance) {
      return [];
    }
    return instance.getData();
  }
}

export const dataDisplayManager = new DataDisplayManager();
