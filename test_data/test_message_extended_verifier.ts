import {
  EXTENDED_DATA2_DESCRIPTOR,
  EXTENDED_DATA_DESCRIPTOR,
  ExtendedData,
  ExtendedData2,
} from "./test_message_extended";
import { NamedTypeKind } from "selfage/named_type_descriptor";
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
console.log(extendedData);
console.log(extendedData2);

// Check EXTENDED_DATA_DESCRIPTOR.
assert(EXTENDED_DATA_DESCRIPTOR.name === "ExtendedData");
assert(EXTENDED_DATA_DESCRIPTOR.kind === NamedTypeKind.MESSAGE);
assert(EXTENDED_DATA_DESCRIPTOR.messageFields.length === 2);
assert(EXTENDED_DATA_DESCRIPTOR.messageFields[0].name === "data1");
assert(EXTENDED_DATA_DESCRIPTOR.messageFields[1].name === "extendedField");

// Check EXTENDED_DATA2_DESCRIPTOR.
assert(EXTENDED_DATA2_DESCRIPTOR.name === "ExtendedData2");
assert(EXTENDED_DATA2_DESCRIPTOR.kind === NamedTypeKind.MESSAGE);
assert(EXTENDED_DATA2_DESCRIPTOR.messageFields.length === 3);
assert(EXTENDED_DATA2_DESCRIPTOR.messageFields[0].name === "data1");
assert(EXTENDED_DATA2_DESCRIPTOR.messageFields[1].name === "data2");
assert(EXTENDED_DATA2_DESCRIPTOR.messageFields[2].name === "extendedField");
