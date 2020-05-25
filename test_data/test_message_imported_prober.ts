import { assert } from "selfage/test_base";
import {
  ExtendedData,
  ExtendedDataParser,
  NestedData,
  NestedDataParser,
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
let parsedExtendedData = new ExtendedDataParser().from(extendedData);
let parsedNestedData = new NestedDataParser().from(nestedData);

// Verify
assert(parsedExtendedData.stringField === "lalala");
assert(parsedExtendedData.extendedField === "exxxxxx");
assert(parsedNestedData.basicData.numberField === 11);
assert(parsedNestedData.color === Color.RED);
