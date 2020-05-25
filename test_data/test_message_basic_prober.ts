import { assert } from "selfage/test_base";
import {
  BasicData,
  BasicDataParser,
  ExportsOptionals,
  ExportsOptionalsParser,
  NoExportOneEnum,
  NoExportOneEnumParser,
  Color,
  ColorParser,
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
let parsedBasicData = new BasicDataParser().from(missingBooleanField);
let parsedExportsOptionals = new ExportsOptionalsParser().from(
  missingStringField
);
let parsedOneEnum = new NoExportOneEnumParser().from(oneEnum);
let parsedBlue = new ColorParser().from(blue);
let randomData = new BasicDataParser().from({ random: 0 });
let undefinedData = new BasicDataParser().from(undefined);
let nullData = new BasicDataParser().from(null);
let outOfRangeEnum = new NoExportOneEnumParser().from(20);

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
