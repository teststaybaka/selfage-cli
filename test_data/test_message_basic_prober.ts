import { assert } from "selfage/test_base";
import {
  BasicData,
  BASIC_DATA_UTIL,
  ExportsOptionals,
  EXPORTS_OPTIONALS_UTIL,
  NoExportOneEnum,
  NO_EXPORT_ONE_ENUM_UTIL,
  Color,
  COLOR_UTIL,
} from "./test_message_basic";

// Prepare
let missingBooleanField: BasicData = {
  numberField: 1,
  stringField: "lalala",
};
let missingStringField: ExportsOptionals = {
  numberField: 10,
  booleanField: true,
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
assert(parsedExportsOptionals.numberField === 10);
assert(parsedExportsOptionals.booleanField);
assert(parsedExportsOptionals.stringField === undefined);
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
