import { NESTED_DATA_UTIL, NestedData, TestEnum } from "./test_message_nested";
import { assert } from "selfage/test_base";
import "source-map-support/register";

// Prepare
let nestedData: NestedData = {
  basicData: {
    data1: "lalala",
  },
  basicData2: {
    data2: "hahaha",
  },
  testEnum: TestEnum.ONE,
  basicDataArray: [
    "string" as any,
    { data1: "la" },
    { data2: "what?" } as any,
    undefined,
  ],
};

// Execute
let parsedNestedData = NESTED_DATA_UTIL.from(nestedData);

// Verify
assert(parsedNestedData.basicData.data1 === "lalala");
assert(parsedNestedData.basicData2.data2 === "hahaha");
assert(parsedNestedData.testEnum === TestEnum.ONE);
assert(parsedNestedData.basicDataArray.length === 2);
assert(parsedNestedData.basicDataArray[0].data1 === "la");
assert(parsedNestedData.basicDataArray[1].data1 === undefined);
assert((parsedNestedData.basicDataArray[1] as any).data2 === undefined);
