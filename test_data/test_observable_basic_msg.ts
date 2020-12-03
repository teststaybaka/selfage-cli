export enum Color {
  RED = 1,
}

// @Observable
export interface BasicData {
  booleanField: boolean;
  numberArrayField: number[];
}

// Comment1
// @Observable
// Comment2
interface DataWithComment {
  stringField: string;
  // Comment3
  stringArrayField: string[];
  booleanArrayField: boolean[];
}

/**
 * Comment4
 * @Observable
 * Comment5
 **/
interface DataWithMultilineComment {
  numberField: number;
}
