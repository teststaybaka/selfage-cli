import {
  EXTENDED_DATA2_UTIL,
  EXTENDED_DATA_UTIL,
  ExtendedData,
  ExtendedData2,
} from "./test_message_extended";
import { assert } from "selfage/test_base";
import "source-map-support/register";

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
