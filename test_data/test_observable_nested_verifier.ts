import { BasicData, Color, NestedData } from "./test_observable_nested";
import { assert } from "selfage/test_base";
import { ObservableNestedArray } from 'selfage/observable_array';

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

let basicData1 = new BasicData();
observableNestedArray.push(basicData1);
assert(count === 5);

basicData1.data1 = 'xaxa';
assert(count === 6);
