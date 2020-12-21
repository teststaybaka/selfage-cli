import {
  BASIC_DATA,
  BasicData,
  COLOR,
  Color,
  NESTED_DATA,
  NestedData,
} from "./test_observable_nested";
import { ObservableNestedArray } from "selfage/observable_array";
import { assert } from "selfage/test_base";

assert(NESTED_DATA.name === "NestedData");
assert(NESTED_DATA.fields.length === 3);
assert(NESTED_DATA.fields[0].name === "color");
assert(NESTED_DATA.fields[0].enumDescriptor === COLOR);
assert(NESTED_DATA.fields[0].arrayFactoryFn === undefined);
assert(NESTED_DATA.fields[0].observableArrayFactoryFn === undefined);
assert(NESTED_DATA.fields[1].name === "basicData");
assert(NESTED_DATA.fields[1].messageDescriptor === BASIC_DATA);
assert(NESTED_DATA.fields[1].arrayFactoryFn === undefined);
assert(NESTED_DATA.fields[1].observableArrayFactoryFn === undefined);
assert(NESTED_DATA.fields[2].name === "datas");
assert(NESTED_DATA.fields[2].messageDescriptor === BASIC_DATA);
assert(NESTED_DATA.fields[2].arrayFactoryFn === undefined);
assert(NESTED_DATA.fields[2].observableArrayFactoryFn !== undefined);

let count = 0;
let count2 = 0;
let nestedData = new NestedData();
nestedData.onChange = () => {
  count++;
};
nestedData.onColorChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === Color.RED);
  assert(oldValue === undefined);
};
nestedData.color = Color.RED;
assert(count === 1);
assert(count2 === 1);

count2 = 0;
let basicData = new BasicData();
nestedData.onBasicDataChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === basicData);
  assert(oldValue === undefined);
};
nestedData.basicData = basicData;
assert(count === 2);
assert(count2 === 1);

basicData.data1 = "haha";
assert(count === 3);

count2 = 0;
let observableNestedArray = new ObservableNestedArray<BasicData>();
nestedData.onDatasChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === observableNestedArray);
  assert(oldValue === undefined);
};
nestedData.datas = observableNestedArray;
assert(count === 4);
assert(count2 === 1);

count2 = 0;
let observableNestedArray2 = NESTED_DATA.fields[2].observableArrayFactoryFn() as ObservableNestedArray<
  any
>;
nestedData.onDatasChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === observableNestedArray2);
  assert(oldValue === observableNestedArray);
};
nestedData.datas = observableNestedArray2;
assert(count === 5);
assert(count2 === 1);

let basicData1 = new BasicData();
nestedData.datas.push(basicData1);
assert(count === 6);

basicData1.data1 = "xaxa";
assert(count === 7);
