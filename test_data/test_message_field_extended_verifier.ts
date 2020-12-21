import { BASIC_DATA, COLOR } from "./test_message_basic";
import {
  EXTEND_NESTED_DATA,
  ExtendNestedData,
} from "./test_message_field_extended";
import { EXTENDED_DATA } from "./test_message_imported";
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
assert(EXTEND_NESTED_DATA.fields.length === 3);
assert(EXTEND_NESTED_DATA.fields[0].name === "basicData");
assert(EXTEND_NESTED_DATA.fields[0].messageDescriptor === BASIC_DATA);
assert(EXTEND_NESTED_DATA.fields[1].name === "color");
assert(EXTEND_NESTED_DATA.fields[1].enumDescriptor === COLOR);
assert(EXTEND_NESTED_DATA.fields[2].name === "basicData");
assert(EXTEND_NESTED_DATA.fields[2].messageDescriptor === EXTENDED_DATA);
