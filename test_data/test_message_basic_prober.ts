import {
  BASIC_DATA_UTIL,
  BasicData,
  COLOR_UTIL,
  Color,
  EXPORTS_OPTIONALS_UTIL,
  ExportsOptionals,
  NO_EXPORT_ONE_ENUM_UTIL,
  NoExportOneEnum,
} from "./test_message_basic";
import { assert } from "selfage/test_base";
import "source-map-support/register";

// Prepare
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
let oneEnum = NoExportOneEnum.ONE;
let blue = Color.BLUE;
let red = "RED";

// Execute
let parsedBasicData = BASIC_DATA_UTIL.from(missingBooleanField);
let parsedExportsOptionals = EXPORTS_OPTIONALS_UTIL.from(missingStringField);
let parsedOneEnum = NO_EXPORT_ONE_ENUM_UTIL.from(oneEnum);
let parsedBlue = COLOR_UTIL.from(blue);
let parsedRed = COLOR_UTIL.from(red);
let randomData = BASIC_DATA_UTIL.from({ random: 0 });
let undefinedData = BASIC_DATA_UTIL.from(undefined);
let nullData = BASIC_DATA_UTIL.from(null);
let outOfRangeOneEnum = NO_EXPORT_ONE_ENUM_UTIL.from(20);
let randomColor = COLOR_UTIL.from("random");
let undefinedColor = COLOR_UTIL.from(undefined);
let nullColor = COLOR_UTIL.from(null);

// Verify
assert(parsedBasicData.numberField === 1);
assert(parsedBasicData.stringField === "lalala");
assert(parsedBasicData.booleanField === undefined);
assert(parsedBasicData.numberArrayField.length === 3);
assert(parsedBasicData.numberArrayField[0] === 3);
assert(parsedBasicData.numberArrayField[1] === 1);
assert(parsedBasicData.numberArrayField[2] === 2);
assert(parsedBasicData.stringArrayField.length === 2);
assert(parsedBasicData.stringArrayField[0] === "ha");
assert(parsedBasicData.stringArrayField[1] === "haha");
assert(parsedBasicData.booleanArrayField === undefined);
assert(parsedExportsOptionals.numberField === 10);
assert(parsedExportsOptionals.booleanField);
assert(parsedExportsOptionals.stringField === undefined);
assert(parsedExportsOptionals.numberArrayField.length === 2);
assert(parsedExportsOptionals.numberArrayField[0] === 20);
assert(parsedExportsOptionals.numberArrayField[1] === 20);
assert(parsedExportsOptionals.stringArrayField === undefined);
assert(parsedExportsOptionals.booleanArrayField.length === 2);
assert(!parsedExportsOptionals.booleanArrayField[0]);
assert(parsedExportsOptionals.booleanArrayField[1]);
assert(parsedOneEnum === NoExportOneEnum.ONE);
assert(parsedBlue === Color.BLUE);
assert(parsedRed === Color.RED);
assert(randomData.numberField === undefined);
assert(randomData.stringField === undefined);
assert(randomData.booleanField === undefined);
assert((randomData as any).random === undefined);
assert(undefinedData === undefined);
assert(nullData === undefined);
assert(outOfRangeOneEnum === undefined);
assert(randomColor === undefined);
assert(undefinedColor === undefined);
assert(nullColor === undefined);
