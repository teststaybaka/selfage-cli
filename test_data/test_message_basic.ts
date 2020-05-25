interface BasicData {
  numberField: number;
  stringField: string;
  booleanField: boolean;
}

export interface ExportsOptionals {
  numberField?: number;
  stringField?: string;
  booleanField?: boolean;
}

enum NoExportOneEnum {
  ONE = 1,
}

export enum Color {
  RED = 1,
  GREEN = 2,
  BLUE = 10,
}
