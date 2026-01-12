import type { IDataDisplayFilterFactory, IDataDisplaySource } from './types';

export class DataDisplayManager {
  private sources = new Map<string, IDataDisplaySource<any>>();
  private filters = new Map<string, any>();
  private dataSources = new Map<string, any>();
  private filterInstances = new Map<string, any>();

  /**
   * This is the basic source of all data for displaying
   *
   * @param id
   * @param source
   */
  public registerSourceFilter(id: string, source: IDataDisplaySource<any>) {
    this.sources.set(id, source);
  }

  public registerFilter(id: string, filter: IDataDisplayFilterFactory, ...dependencies: any[]) {
    this.filters.set(id, { filter, dependencies });
  }

  public createFilterInstance(filterId: string, dependencies: any) {
    this.filterInstances.set(filterId, dependencies);
    return this.filterInstances.get(filterId);
  }

  public registerDataSource(id: string, instantiateFn: any) {
    this.dataSources.set(id, instantiateFn);
  }

  public filterData(id: string, dependencies: any) {
    this.createFilterInstance(id, dependencies);
    return this.filterInstances.get(id)?.filter(dependencies);
  }

  /** hook */
  public useFilterData(id: string, dependencies: any) {
    // Temporary stub - this would be a React hook in actual implementation
    return [];
  }
}

export const dataDisplayManager = new DataDisplayManager();
