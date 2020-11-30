import { BasicData, Color, BASIC_DATA, COLOR } from './test_message_basic';
import { NamedTypeDescriptor, NamedTypeKind, MessageFieldType } from 'selfage/named_type_descriptor';

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

export interface NestedData {
  basicData?: BasicData,
  color?: Color,
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
      name: 'color',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: COLOR,
    },
  ]
};
