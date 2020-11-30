import { NamedTypeDescriptor, NamedTypeKind, MessageFieldType } from 'selfage/named_type_descriptor';

export interface BasicData {
  numberField?: number,
  stringField?: string,
  booleanField?: boolean,
  numberArrayField?: number[],
  stringArrayField?: string[],
  booleanArrayField?: boolean[],
}

export let BASIC_DATA: NamedTypeDescriptor<BasicData> = {
  name: 'BasicData',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: 'numberField',
      type: MessageFieldType.NUMBER,
    },
    {
      name: 'stringField',
      type: MessageFieldType.STRING,
    },
    {
      name: 'booleanField',
      type: MessageFieldType.BOOLEAN,
    },
    {
      name: 'numberArrayField',
      type: MessageFieldType.NUMBER,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
    {
      name: 'stringArrayField',
      type: MessageFieldType.STRING,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
    {
      name: 'booleanArrayField',
      type: MessageFieldType.BOOLEAN,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ]
};

// Comment1
// Comment2
export interface ExportsOptionals {
  numberField?: number,
  stringField?: string,
// Comment3
  booleanField?: boolean,
  numberArrayField?: number[],
  stringArrayField?: string[],
  booleanArrayField?: boolean[],
}

export let EXPORTS_OPTIONALS: NamedTypeDescriptor<ExportsOptionals> = {
  name: 'ExportsOptionals',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: 'numberField',
      type: MessageFieldType.NUMBER,
    },
    {
      name: 'stringField',
      type: MessageFieldType.STRING,
    },
    {
      name: 'booleanField',
      type: MessageFieldType.BOOLEAN,
    },
    {
      name: 'numberArrayField',
      type: MessageFieldType.NUMBER,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
    {
      name: 'stringArrayField',
      type: MessageFieldType.STRING,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
    {
      name: 'booleanArrayField',
      type: MessageFieldType.BOOLEAN,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ]
};

export enum NoExportOneEnum {
  ONE = 1,
}

export let NO_EXPORT_ONE_ENUM: NamedTypeDescriptor<NoExportOneEnum> = {
  name: 'NoExportOneEnum',
  kind: NamedTypeKind.ENUM,
  enumValues: [
    {
      name: 'ONE',
      value: 1,
    },
  ]
}

// Comment4
export enum Color {
// Comment5
  RED = 1,
  GREEN = 2,
  BLUE = 10,
}

export let COLOR: NamedTypeDescriptor<Color> = {
  name: 'Color',
  kind: NamedTypeKind.ENUM,
  enumValues: [
    {
      name: 'RED',
      value: 1,
    },
    {
      name: 'GREEN',
      value: 2,
    },
    {
      name: 'BLUE',
      value: 10,
    },
  ]
}
