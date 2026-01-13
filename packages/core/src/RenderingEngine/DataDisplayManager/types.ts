export interface IDataDisplayFilterFactory {
  (...args: any[]): IDataDisplayFilter;
}

export interface IDataDisplayFilter {
  filter: (object: any) => boolean;
}

export interface IDataDisplaySource<T> {
  init: () => Map<string, T>;
  destroy: (values: Map<string, T>) => void;
}

export interface IDataDisplayFilterInstance {
  id: string;
  filter: IDataDisplayFilter;
  dependsOn: any;
  sourceId: string;
  getData: () => any;
}

export interface IDataDisplayFilterOptions {
  sourceId: string;
  dependsOn: string[];
}
