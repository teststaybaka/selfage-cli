import {
  BASIC_DATA,
  BasicData,
  COLOR,
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

// BASIC_DATA is expected.
assert(BASIC_DATA.name === "BasicData");
assert(BASIC_DATA.kind === NamedTypeKind.MESSAGE);
assert(BASIC_DATA.messageFields.length === 6);
assert(BASIC_DATA.messageFields[0].name === "numberField");
assert(BASIC_DATA.messageFields[0].type === MessageFieldType.NUMBER);
assert(BASIC_DATA.messageFields[0].arrayFactoryFn === undefined);
assert(BASIC_DATA.messageFields[1].name === "stringField");
assert(BASIC_DATA.messageFields[1].type === MessageFieldType.STRING);
assert(BASIC_DATA.messageFields[1].arrayFactoryFn === undefined);
assert(BASIC_DATA.messageFields[2].name === "booleanField");
assert(BASIC_DATA.messageFields[2].type === MessageFieldType.BOOLEAN);
assert(BASIC_DATA.messageFields[2].arrayFactoryFn === undefined);
assert(BASIC_DATA.messageFields[3].name === "numberArrayField");
assert(BASIC_DATA.messageFields[3].type === MessageFieldType.NUMBER);
assert(BASIC_DATA.messageFields[3].arrayFactoryFn !== undefined);
assert(BASIC_DATA.messageFields[4].name === "stringArrayField");
assert(BASIC_DATA.messageFields[4].type === MessageFieldType.STRING);
assert(BASIC_DATA.messageFields[4].arrayFactoryFn !== undefined);
assert(BASIC_DATA.messageFields[5].name === "booleanArrayField");
assert(BASIC_DATA.messageFields[5].type === MessageFieldType.BOOLEAN);
assert(BASIC_DATA.messageFields[5].arrayFactoryFn !== undefined);

// All enums are present.
let one = NoExportOneEnum.ONE;
let blue = Color.BLUE;
let red = Color.RED;
let green = Color.GREEN;

// COLOR is expected.
assert(COLOR.name === "Color");
assert(COLOR.kind === NamedTypeKind.ENUM);
assert(COLOR.enumValues.length === 3);
assert(COLOR.enumValues[0].name === "RED");
assert(COLOR.enumValues[0].value === 1);
assert(COLOR.enumValues[1].name === "GREEN");
assert(COLOR.enumValues[1].value === 2);
assert(COLOR.enumValues[2].name === "BLUE");
assert(COLOR.enumValues[2].value === 10);
