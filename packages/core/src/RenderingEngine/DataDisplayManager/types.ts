export interface IDataDisplayFilterFactory {
  (...args: any[]): IDataDisplayFilter;
}

export interface IDataDisplayFilter {
  filter: (object: any) => boolean;
}

export interface IDataDisplaySource<T> {
  init: (onDelete: any, onUpdate: any, onAdd: any) => Map<string, T>;
  destroy: (values: Map<string, T>) => void;
}
