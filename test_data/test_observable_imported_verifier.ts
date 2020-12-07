import { BASIC_DATA, BasicData } from "./test_observable_basic";
import { NESTED_DATA, NestedData } from "./test_observable_imported";
import { assert } from "selfage/test_base";

let count = 0;
let count2 = 0;
let nestedData = new NestedData();
let basicData = new BasicData();
nestedData.onChange = () => {
  count++;
};
nestedData.onBasicDataChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === basicData);
  assert(oldValue === undefined);
};
nestedData.basicData = basicData;
assert(count === 1);
assert(count2 === 1);

basicData.booleanField = false;
assert(count === 2);
