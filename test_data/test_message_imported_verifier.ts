import { Color } from "./test_message_basic";
import { ExtendedData, NestedData } from "./test_message_imported";

// Type check.
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
