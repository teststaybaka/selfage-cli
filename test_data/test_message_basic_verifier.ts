import {
  BASIC_DATA_DESCRIPTOR,
  BasicData,
  COLOR_DESCRIPTOR,
  Color,
  ExportsOptionals,
  NoExportOneEnum,
} from "./test_message_basic";
import { MessageFieldType, NamedTypeKind } from "selfage/named_type_descriptor";
import { assert } from "selfage/test_base";

// Fields are optional.
let missingBooleanField: BasicData = {
  numberField: 1,
  stringField: "lalala",
  numberArrayField: [3, 1, 2],
  stringArrayField: ["ha", "haha"],
};
let missingStringField: ExportsOptionals = {
  numberField: 10,
  booleanField: true,
  numberArrayField: [20, "ha" as any, 20],
  booleanArrayField: [undefined, false, true],
};
console.log(missingBooleanField);
console.log(missingStringField);

// BASIC_DATA_DESCRIPTOR is expected.
assert(BASIC_DATA_DESCRIPTOR.name === "BasicData");
assert(BASIC_DATA_DESCRIPTOR.kind === NamedTypeKind.MESSAGE);
assert(BASIC_DATA_DESCRIPTOR.messageFields.length === 6);
assert(BASIC_DATA_DESCRIPTOR.messageFields[0].name === "numberField");
assert(BASIC_DATA_DESCRIPTOR.messageFields[0].type === MessageFieldType.NUMBER);
assert(!BASIC_DATA_DESCRIPTOR.messageFields[0].isArray);
assert(BASIC_DATA_DESCRIPTOR.messageFields[1].name === "stringField");
assert(BASIC_DATA_DESCRIPTOR.messageFields[1].type === MessageFieldType.STRING);
assert(!BASIC_DATA_DESCRIPTOR.messageFields[1].isArray);
assert(BASIC_DATA_DESCRIPTOR.messageFields[2].name === "booleanField");
assert(
  BASIC_DATA_DESCRIPTOR.messageFields[2].type === MessageFieldType.BOOLEAN
);
assert(!BASIC_DATA_DESCRIPTOR.messageFields[2].isArray);
assert(BASIC_DATA_DESCRIPTOR.messageFields[3].name === "numberArrayField");
assert(BASIC_DATA_DESCRIPTOR.messageFields[3].type === MessageFieldType.NUMBER);
assert(BASIC_DATA_DESCRIPTOR.messageFields[3].isArray);
assert(BASIC_DATA_DESCRIPTOR.messageFields[4].name === "stringArrayField");
assert(BASIC_DATA_DESCRIPTOR.messageFields[4].type === MessageFieldType.STRING);
assert(BASIC_DATA_DESCRIPTOR.messageFields[4].isArray);
assert(BASIC_DATA_DESCRIPTOR.messageFields[5].name === "booleanArrayField");
assert(
  BASIC_DATA_DESCRIPTOR.messageFields[5].type === MessageFieldType.BOOLEAN
);
assert(BASIC_DATA_DESCRIPTOR.messageFields[5].isArray);

// All enums are present.
let one = NoExportOneEnum.ONE;
let blue = Color.BLUE;
let red = Color.RED;
let green = Color.GREEN;
console.log(one);
console.log(blue);
console.log(red);
console.log(green);

// COLOR_DESCRIPTOR is expected.
assert(COLOR_DESCRIPTOR.name === "Color");
assert(COLOR_DESCRIPTOR.kind === NamedTypeKind.ENUM);
assert(COLOR_DESCRIPTOR.enumValues.length === 3);
assert(COLOR_DESCRIPTOR.enumValues[0].name === "RED");
assert(COLOR_DESCRIPTOR.enumValues[0].value === 1);
assert(COLOR_DESCRIPTOR.enumValues[1].name === "GREEN");
assert(COLOR_DESCRIPTOR.enumValues[1].value === 2);
assert(COLOR_DESCRIPTOR.enumValues[2].name === "BLUE");
assert(COLOR_DESCRIPTOR.enumValues[2].value === 10);
