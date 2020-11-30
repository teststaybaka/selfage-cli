import { NamedTypeDescriptor, NamedTypeKind, MessageFieldType } from 'selfage/named_type_descriptor';

export enum TestEnum {
  ONE = 1,
}

export let TEST_ENUM: NamedTypeDescriptor<TestEnum> = {
  name: 'TestEnum',
  kind: NamedTypeKind.ENUM,
  enumValues: [
    {
      name: 'ONE',
      value: 1,
    },
  ]
}

export interface BasicData {
  data1?: string,
}

export let BASIC_DATA: NamedTypeDescriptor<BasicData> = {
  name: 'BasicData',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: 'data1',
      type: MessageFieldType.STRING,
    },
  ]
};

export interface BasicData2 {
  data2?: string,
}

export let BASIC_DATA2: NamedTypeDescriptor<BasicData2> = {
  name: 'BasicData2',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: 'data2',
      type: MessageFieldType.STRING,
    },
  ]
};

export interface NestedData {
  basicData?: BasicData,
  basicData2?: BasicData2,
  testEnum?: TestEnum,
  basicDataArray?: BasicData[],
}

export let NESTED_DATA: NamedTypeDescriptor<NestedData> = {
  name: 'NestedData',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: 'basicData',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: BASIC_DATA,
    },
    {
      name: 'basicData2',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: BASIC_DATA2,
    },
    {
      name: 'testEnum',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: TEST_ENUM,
    },
    {
      name: 'basicDataArray',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: BASIC_DATA,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ]
};
