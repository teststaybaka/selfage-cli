import { assert } from "selfage/test_base";
import { TestEnum, NestedData, NestedDataParser } from "./test_message_nested";

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
let parsedNestedData = new NestedDataParser().from(nestedData);

// Verify
assert(parsedNestedData.basicData.data1 === "lalala");
assert(parsedNestedData.basicData2.data2 === "hahaha");
assert(parsedNestedData.testEnum === TestEnum.ONE);
