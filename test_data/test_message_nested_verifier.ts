import {
  BASIC_DATA,
  BASIC_DATA2,
  NESTED_DATA,
  NestedData,
  TEST_ENUM,
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

// Check NESTED_DATA.
assert(NESTED_DATA.name === "NestedData");
assert(NESTED_DATA.kind === NamedTypeKind.MESSAGE);
assert(NESTED_DATA.messageFields.length === 4);
assert(NESTED_DATA.messageFields[0].name === "basicData");
assert(NESTED_DATA.messageFields[0].type === MessageFieldType.NAMED_TYPE);
assert(NESTED_DATA.messageFields[0].namedTypeDescriptor === BASIC_DATA);
assert(NESTED_DATA.messageFields[0].arrayFactoryFn === undefined);
assert(NESTED_DATA.messageFields[1].name === "basicData2");
assert(NESTED_DATA.messageFields[1].type === MessageFieldType.NAMED_TYPE);
assert(NESTED_DATA.messageFields[1].namedTypeDescriptor === BASIC_DATA2);
assert(NESTED_DATA.messageFields[1].arrayFactoryFn === undefined);
assert(NESTED_DATA.messageFields[2].name === "testEnum");
assert(NESTED_DATA.messageFields[2].type === MessageFieldType.NAMED_TYPE);
assert(NESTED_DATA.messageFields[2].namedTypeDescriptor === TEST_ENUM);
assert(NESTED_DATA.messageFields[2].arrayFactoryFn === undefined);
assert(NESTED_DATA.messageFields[3].name === "basicDataArray");
assert(NESTED_DATA.messageFields[3].type === MessageFieldType.NAMED_TYPE);
assert(NESTED_DATA.messageFields[3].namedTypeDescriptor === BASIC_DATA);
assert(NESTED_DATA.messageFields[3].arrayFactoryFn !== undefined);
