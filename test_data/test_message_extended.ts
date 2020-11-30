import { NamedTypeDescriptor, NamedTypeKind, MessageFieldType } from 'selfage/named_type_descriptor';

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

export interface ExtendedData extends BasicData {
  extendedField?: string,
}

export let EXTENDED_DATA: NamedTypeDescriptor<ExtendedData> = {
  name: 'ExtendedData',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    ...BASIC_DATA.messageFields,
    {
      name: 'extendedField',
      type: MessageFieldType.STRING,
    },
  ]
};

export interface ExtendedData2 extends BasicData, BasicData2 {
  extendedField?: string,
}

export let EXTENDED_DATA2: NamedTypeDescriptor<ExtendedData2> = {
  name: 'ExtendedData2',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    ...BASIC_DATA.messageFields,
    ...BASIC_DATA2.messageFields,
    {
      name: 'extendedField',
      type: MessageFieldType.STRING,
    },
  ]
};
