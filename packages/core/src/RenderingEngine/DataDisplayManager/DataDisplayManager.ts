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
  private filterInstances = new Map<string, IDataDisplayFilterInstance>();
  private initializedSources = new Map<string, Map<string, any>>();
  private sourceDependencyMap = new Map<string, Set<string>>();

  public registerSource(id: string, source: IDataDisplaySource<any>) {
    this.sources.set(id, source);
  }

  public createFilterInstance(id: string, dependsOn: any) {
    const factoryEntry = this.filterFactories.get(id);
    if (!factoryEntry) {
      return null;
    }

    const { filterFactory, options } = factoryEntry;
    if (!filterFactory) {
      return null;
    }

    const key = createCacheKey(id, dependsOn);
    const existingInstance = this.filterInstances.get(key);

    if (existingInstance) {
      const sourceIdChanged = existingInstance.sourceId !== options.sourceId;
      if (sourceIdChanged) {
        this._invalidateInstance(key, existingInstance);
      } else {
        return existingInstance;
      }
    }

    const filter = filterFactory(dependsOn);
    const instance: IDataDisplayFilterInstance = {
      id,
      filter,
      dependsOn,
      sourceId: options.sourceId,
      getData: () => this._applyFilter(instance),
    };

    this.filterInstances.set(key, instance);

    if (options.dependsOn && Array.isArray(options.dependsOn)) {
      options.dependsOn.forEach((sourceId: string) => {
        if (!this.sourceDependencyMap.has(sourceId)) {
          this.sourceDependencyMap.set(sourceId, new Set());
        }
        this.sourceDependencyMap.get(sourceId)?.add(key);
      });
    }

    return instance;
  }

  private _invalidateInstance(
    key: string,
    instance: IDataDisplayFilterInstance
  ) {
    this.filterInstances.delete(key);

    this.sourceDependencyMap.forEach((instanceKeys) => {
      instanceKeys.delete(key);
    });
  }

  public invalidateBySource(sourceId: string) {
    const keysToInvalidate = new Set<string>();

    const dependencyKeys = this.sourceDependencyMap.get(sourceId);
    if (dependencyKeys) {
      dependencyKeys.forEach((key) => keysToInvalidate.add(key));
    }

    this.filterInstances.forEach((instance, key) => {
      if (instance.sourceId === sourceId) {
        keysToInvalidate.add(key);
      }
    });

    keysToInvalidate.forEach((key) => {
      const instance = this.filterInstances.get(key);
      if (instance) {
        this._invalidateInstance(key, instance);
      }
    });
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
