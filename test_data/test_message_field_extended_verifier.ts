import { BASIC_DATA, COLOR } from "./test_message_basic";
import {
  EXTEND_NESTED_DATA,
  ExtendNestedData,
} from "./test_message_field_extended";
import { EXTENDED_DATA } from "./test_message_imported";
import { NamedTypeKind } from "selfage/named_type_descriptor";
import { assert } from "selfage/test_base";

// Type check.
let extendNestedData: ExtendNestedData = {
  basicData: {
    numberField: 10,
    extendedField: "lalala",
  },
};

// Verify
assert(EXTEND_NESTED_DATA.name === "ExtendNestedData");
assert(EXTEND_NESTED_DATA.kind === NamedTypeKind.MESSAGE);
assert(EXTEND_NESTED_DATA.messageFields.length === 3);
assert(EXTEND_NESTED_DATA.messageFields[0].name === "basicData");
assert(EXTEND_NESTED_DATA.messageFields[0].namedTypeDescriptor === BASIC_DATA);
assert(EXTEND_NESTED_DATA.messageFields[1].name === "color");
assert(EXTEND_NESTED_DATA.messageFields[1].namedTypeDescriptor === COLOR);
assert(EXTEND_NESTED_DATA.messageFields[2].name === "basicData");
assert(
  EXTEND_NESTED_DATA.messageFields[2].namedTypeDescriptor === EXTENDED_DATA
);
