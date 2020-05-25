import { assert } from "selfage/test_base";
import { TestEnum, NestedData, NESTED_DATA_UTIL } from "./test_message_nested";

// Prepare
let nestedData: NestedData = {
  basicData: {
    data1: "lalala",
  },
  basicData2: {
    data2: "hahaha",
  },
  testEnum: TestEnum.ONE,
};

// Execute
let parsedNestedData = NESTED_DATA_UTIL.from(nestedData);

// Verify
assert(parsedNestedData.basicData.data1 === "lalala");
assert(parsedNestedData.basicData2.data2 === "hahaha");
assert(parsedNestedData.testEnum === TestEnum.ONE);
