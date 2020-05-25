import { assert } from "selfage/test_base";
import {
  ExtendNestedData,
  EXTEND_NESTED_DATA_UTIL,
} from "./test_message_field_extended";

// Prepare
let extendNestedData: ExtendNestedData = {
  basicData: {
    numberField: 10,
    extendedField: "lalala",
  },
};

// Execute
let parsedExtendNestedData = EXTEND_NESTED_DATA_UTIL.from(extendNestedData);

// Verify
assert(parsedExtendNestedData.basicData.numberField === 10);
assert(parsedExtendNestedData.basicData.extendedField === "lalala");
