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

// Execute
let parsedBasicData = BASIC_DATA_UTIL.from(missingBooleanField);
let parsedExportsOptionals = EXPORTS_OPTIONALS_UTIL.from(missingStringField);
let parsedOneEnum = NO_EXPORT_ONE_ENUM_UTIL.from(oneEnum);
let parsedBlue = COLOR_UTIL.from(blue);
let randomData = BASIC_DATA_UTIL.from({ random: 0 });
let undefinedData = BASIC_DATA_UTIL.from(undefined);
let nullData = BASIC_DATA_UTIL.from(null);
let outOfRangeEnum = BASIC_DATA_UTIL.from(20);

// Verify
assert(parsedBasicData.numberField === 1);
assert(parsedBasicData.stringField === "lalala");
assert(parsedBasicData.booleanField === undefined);
assert(parsedExportsOptionals.numberField === 10);
assert(parsedExportsOptionals.booleanField);
assert(parsedExportsOptionals.stringField === undefined);
assert(parsedOneEnum === NoExportOneEnum.ONE);
assert(parsedBlue === Color.BLUE);
assert(randomData.numberField === undefined);
assert(randomData.stringField === undefined);
assert(randomData.booleanField === undefined);
assert((randomData as any).random === undefined);
assert(undefinedData === undefined);
assert(nullData === undefined);
assert(outOfRangeEnum === undefined);
