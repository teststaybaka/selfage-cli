export interface BasicData {
  numberField: number;
  stringField: string;
  booleanField: boolean;
  numberArrayField: number[];
  stringArrayField: string[];
  booleanArrayField: boolean[];
}

// Comment1
// Comment2
export interface ExportsOptionals {
  numberField?: number;
  stringField?: string;
  // Comment3
  booleanField?: boolean;
  numberArrayField?: number[];
  stringArrayField?: string[];
  booleanArrayField?: boolean[];
  // Ignored
}

enum NoExportOneEnum {
  ONE = 1,
}

// Comment4
export enum Color {
  // Comment5
  RED = 1,
  GREEN = 2,
  BLUE = 10,
}
