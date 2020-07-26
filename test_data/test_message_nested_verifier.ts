import {
  BASIC_DATA2_DESCRIPTOR,
  BASIC_DATA_DESCRIPTOR,
  NESTED_DATA_DESCRIPTOR,
  NestedData,
  TEST_ENUM_DESCRIPTOR,
  TestEnum,
} from "./test_message_nested";
import { MessageFieldType, NamedTypeKind } from "selfage/named_type_descriptor";
import { assert } from "selfage/test_base";

// Check types in NestedData.
let nestedData: NestedData = {
  basicData: {
    data1: "lalala",
  },
  basicData2: {
    data2: "hahaha",
  },
  testEnum: TestEnum.ONE,
  basicDataArray: [{ data1: "la" }],
};
console.log(nestedData);

// Check NESTED_DATA_DESCRIPTOR.
assert(NESTED_DATA_DESCRIPTOR.name === "NestedData");
assert(NESTED_DATA_DESCRIPTOR.kind === NamedTypeKind.MESSAGE);
assert(NESTED_DATA_DESCRIPTOR.messageFields.length === 4);
assert(NESTED_DATA_DESCRIPTOR.messageFields[0].name === "basicData");
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[0].type === MessageFieldType.NAMED_TYPE
);
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[0].namedTypeDescriptor ===
    BASIC_DATA_DESCRIPTOR
);
assert(!NESTED_DATA_DESCRIPTOR.messageFields[0].isArray);
assert(NESTED_DATA_DESCRIPTOR.messageFields[1].name === "basicData2");
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[1].type === MessageFieldType.NAMED_TYPE
);
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[1].namedTypeDescriptor ===
    BASIC_DATA2_DESCRIPTOR
);
assert(!NESTED_DATA_DESCRIPTOR.messageFields[1].isArray);
assert(NESTED_DATA_DESCRIPTOR.messageFields[2].name === "testEnum");
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[2].type === MessageFieldType.NAMED_TYPE
);
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[2].namedTypeDescriptor ===
    TEST_ENUM_DESCRIPTOR
);
assert(!NESTED_DATA_DESCRIPTOR.messageFields[2].isArray);
assert(NESTED_DATA_DESCRIPTOR.messageFields[3].name === "basicDataArray");
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[3].type === MessageFieldType.NAMED_TYPE
);
assert(
  NESTED_DATA_DESCRIPTOR.messageFields[3].namedTypeDescriptor ===
    BASIC_DATA_DESCRIPTOR
);
assert(NESTED_DATA_DESCRIPTOR.messageFields[3].isArray);
