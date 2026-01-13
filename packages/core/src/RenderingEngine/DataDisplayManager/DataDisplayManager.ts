import type {
  IDataDisplayFilterFactory,
  IDataDisplayFilterInstance,
  IDataDisplayFilterOptions,
  IDataDisplaySource,
} from './types';
import { createCacheKey } from './utils';

export class DataDisplayManager {
  private sources = new Map<string, IDataDisplaySource<any>>();
  private filterFactories = new Map<string, any>();
  private filterInstances = new Map<string, any>();
  private initializedSources = new Map<string, Map<string, any>>();

  public registerSource(id: string, source: IDataDisplaySource<any>) {
    this.sources.set(id, source);
  }

  public createFilterInstance(id: string, dependsOn: any) {
    /** Filter chain */
    const { filterFactory, options } = this.filterFactories.get(id);
    if (filterFactory) {
      const filter = filterFactory(dependsOn);
      const key = createCacheKey(id, dependsOn);
      const instance = {
        id,
        filter,
        dependsOn,
        sourceId: options.sourceId,
        getData: () => this._applyFilter(instance),
      };
      this.filterInstances.set(key, instance);
      return instance;
    }
  }

  private _applyFilter(instance: IDataDisplayFilterInstance) {
    const { id, filter, sourceId } = instance;

    const source = this.sources.get(sourceId ?? id);
    if (!source) {
      return [];
    }

    if (!this.initializedSources.has(id)) {
      const dataMap = source.init();
      this.initializedSources.set(id, dataMap);
    }

    const dataMap = this.initializedSources.get(id);
    if (!dataMap) {
      return [];
    }

    const dataArray = Array.from(dataMap.values());

    return !filter ? dataArray : dataArray.filter(filter.filter);
  }

  public registerFilter(
    id: string,
    filterFactory: IDataDisplayFilterFactory,
    options: IDataDisplayFilterOptions
  ) {
    this.filterFactories.set(id, { filterFactory, options });
  }

  public filterData(id: string, dependsOn: any) {
    const instance = this.createFilterInstance(id, dependsOn);
    if (!instance) {
      return [];
    }
    return instance.getData();
  }
}

export const dataDisplayManager = new DataDisplayManager();
