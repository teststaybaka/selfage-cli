import { assert } from "selfage/test_base";
import {
  ExtendedData,
  EXTENDED_DATA_UTIL,
  NestedData,
  NESTED_DATA_UTIL,
} from "./test_message_imported";
import { Color } from "./test_message_basic";

// Prepare
let extendedData: ExtendedData = {
  stringField: "lalala",
  extendedField: "exxxxxx",
};
let nestedData: NestedData = {
  basicData: {
    numberField: 11,
  },
  color: Color.RED,
};

// Execute
let parsedExtendedData = EXTENDED_DATA_UTIL.from(extendedData);
let parsedNestedData = NESTED_DATA_UTIL.from(nestedData);

// Verify
assert(parsedExtendedData.stringField === "lalala");
assert(parsedExtendedData.extendedField === "exxxxxx");
assert(parsedNestedData.basicData.numberField === 11);
assert(parsedNestedData.color === Color.RED);
