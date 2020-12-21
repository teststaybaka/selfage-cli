import {
  EXTENDED_DATA,
  EXTENDED_DATA2,
  ExtendedData,
  ExtendedData2,
} from "./test_message_extended";
import { assert } from "selfage/test_base";

// Type checks.
let extendedData: ExtendedData = {
  data1: "lalala",
  extendedField: "exxx",
};
let extendedData2: ExtendedData2 = {
  data1: "hahaha",
  data2: "dadada",
  extendedField: "exeee",
};

// Check EXTENDED_DATA.
assert(EXTENDED_DATA.name === "ExtendedData");
assert(EXTENDED_DATA.fields.length === 2);
assert(EXTENDED_DATA.fields[0].name === "data1");
assert(EXTENDED_DATA.fields[1].name === "extendedField");

// Check EXTENDED_DATA2.
assert(EXTENDED_DATA2.name === "ExtendedData2");
assert(EXTENDED_DATA2.fields.length === 3);
assert(EXTENDED_DATA2.fields[0].name === "data1");
assert(EXTENDED_DATA2.fields[1].name === "data2");
assert(EXTENDED_DATA2.fields[2].name === "extendedField");
