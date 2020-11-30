import { ExtendedData, NestedData, NESTED_DATA, EXTENDED_DATA } from './test_message_imported';
import { NamedTypeDescriptor, NamedTypeKind, MessageFieldType } from 'selfage/named_type_descriptor';

export interface ExtendNestedData extends NestedData {
  basicData?: ExtendedData,
}

export let EXTEND_NESTED_DATA: NamedTypeDescriptor<ExtendNestedData> = {
  name: 'ExtendNestedData',
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    ...NESTED_DATA.messageFields,
    {
      name: 'basicData',
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: EXTENDED_DATA,
    },
  ]
};
