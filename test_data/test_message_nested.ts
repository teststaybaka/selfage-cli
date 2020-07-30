import { NamedTypeDescriptor, NamedTypeKind, MessageFieldType } from 'selfage/named_type_descriptor';

export enum TestEnum {
  ONE = 1,
}

export let TEST_ENUM_DESCRIPTOR: NamedTypeDescriptor<TestEnum> = {
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

export let BASIC_DATA_DESCRIPTOR: NamedTypeDescriptor<BasicData> = {
  name: 'BasicData',
  kind: NamedTypeKind.MESSAGE,
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

export let BASIC_DATA2_DESCRIPTOR: NamedTypeDescriptor<BasicData2> = {
  name: 'BasicData2',
  kind: NamedTypeKind.MESSAGE,
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

export let NESTED_DATA_DESCRIPTOR: NamedTypeDescriptor<NestedData> = {
  name: 'NestedData',
  kind: NamedTypeKind.MESSAGE,
  messageFields: [
    {
      name: 'basicData',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: BASIC_DATA_DESCRIPTOR,
    },
    {
      name: 'basicData2',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: BASIC_DATA2_DESCRIPTOR,
    },
    {
      name: 'testEnum',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: TEST_ENUM_DESCRIPTOR,
    },
    {
      name: 'basicDataArray',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: BASIC_DATA_DESCRIPTOR,
      isArray: true,
    },
  ]
};
