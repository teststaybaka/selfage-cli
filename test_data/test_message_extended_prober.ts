import { assert } from "selfage/test_base";
import {
  ExtendedData,
  EXTENDED_DATA_UTIL,
  ExtendedData2,
  EXTENDED_DATA2_UTIL,
} from "./test_message_extended";

// Prepare
let extendedData: ExtendedData = {
  data1: "lalala",
  extendedField: "exxx",
};
let extendedData2: ExtendedData2 = {
  data1: "hahaha",
  data2: "dadada",
  extendedField: "exeee",
};

// Execute
let parsedExtendedData = EXTENDED_DATA_UTIL.from(extendedData);
let parsedExtendedData2 = EXTENDED_DATA2_UTIL.from(extendedData2);

// Verify
assert(parsedExtendedData.data1 === "lalala");
assert(parsedExtendedData.extendedField === "exxx");
assert(parsedExtendedData2.data1 === "hahaha");
assert(parsedExtendedData2.data2 === "dadada");
assert(parsedExtendedData2.extendedField === "exeee");
