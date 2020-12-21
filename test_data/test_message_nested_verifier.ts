import {
  BASIC_DATA,
  BASIC_DATA2,
  NESTED_DATA,
  NestedData,
  TEST_ENUM,
  TestEnum,
} from "./test_message_nested";
import { assert } from "selfage/test_base";

// Check types in NestedData.
let nestedData: NestedData = {
  basicData: {
    data1: "lalala",
  },
  basicData2: {
    data2: "hahaha",
  },
  testEnum: TestEnum.ONE,
  basicDataArray: [{ data1: "la" }],
};

// Check NESTED_DATA.
assert(NESTED_DATA.name === "NestedData");
assert(NESTED_DATA.fields.length === 4);
assert(NESTED_DATA.fields[0].name === "basicData");
assert(NESTED_DATA.fields[0].messageDescriptor === BASIC_DATA);
assert(NESTED_DATA.fields[0].arrayFactoryFn === undefined);
assert(NESTED_DATA.fields[0].observableArrayFactoryFn === undefined);
assert(NESTED_DATA.fields[1].name === "basicData2");
assert(NESTED_DATA.fields[1].messageDescriptor === BASIC_DATA2);
assert(NESTED_DATA.fields[1].arrayFactoryFn === undefined);
assert(NESTED_DATA.fields[1].observableArrayFactoryFn === undefined);
assert(NESTED_DATA.fields[2].name === "testEnum");
assert(NESTED_DATA.fields[2].enumDescriptor === TEST_ENUM);
assert(NESTED_DATA.fields[2].arrayFactoryFn === undefined);
assert(NESTED_DATA.fields[2].observableArrayFactoryFn === undefined);
assert(NESTED_DATA.fields[3].name === "basicDataArray");
assert(NESTED_DATA.fields[3].messageDescriptor === BASIC_DATA);
assert(NESTED_DATA.fields[3].arrayFactoryFn !== undefined);
assert(NESTED_DATA.fields[3].observableArrayFactoryFn === undefined);
