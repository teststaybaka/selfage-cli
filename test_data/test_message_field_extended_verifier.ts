import { BASIC_DATA_DESCRIPTOR, COLOR_DESCRIPTOR } from "./test_message_basic";
import {
  EXTEND_NESTED_DATA_DESCRIPTOR,
  ExtendNestedData,
} from "./test_message_field_extended";
import { EXTENDED_DATA_DESCRIPTOR } from "./test_message_imported";
import { NamedTypeKind } from "selfage/named_type_descriptor";
import { assert } from "selfage/test_base";

// Type check.
let extendNestedData: ExtendNestedData = {
  basicData: {
    numberField: 10,
    extendedField: "lalala",
  },
};
console.log(extendNestedData);

// Verify
assert(EXTEND_NESTED_DATA_DESCRIPTOR.name === "ExtendNestedData");
assert(EXTEND_NESTED_DATA_DESCRIPTOR.kind === NamedTypeKind.MESSAGE);
assert(EXTEND_NESTED_DATA_DESCRIPTOR.messageFields.length === 3);
assert(EXTEND_NESTED_DATA_DESCRIPTOR.messageFields[0].name === "basicData");
assert(
  EXTEND_NESTED_DATA_DESCRIPTOR.messageFields[0].namedTypeDescriptor ===
    BASIC_DATA_DESCRIPTOR
);
assert(EXTEND_NESTED_DATA_DESCRIPTOR.messageFields[1].name === "color");
assert(
  EXTEND_NESTED_DATA_DESCRIPTOR.messageFields[1].namedTypeDescriptor ===
    COLOR_DESCRIPTOR
);
assert(EXTEND_NESTED_DATA_DESCRIPTOR.messageFields[2].name === "basicData");
assert(
  EXTEND_NESTED_DATA_DESCRIPTOR.messageFields[2].namedTypeDescriptor ===
    EXTENDED_DATA_DESCRIPTOR
);