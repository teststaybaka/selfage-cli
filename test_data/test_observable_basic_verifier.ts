import {
  BasicData,
  DataWithComment,
  DataWithMultilineComment,
} from "./test_observable_basic";
import { assert } from "selfage/test_base";
import { ObservableArray } from 'selfage/observable_array';

let count = 0;
let count2 = 0;
let basicData = new BasicData();
basicData.onChange = () => {
  count++;
};
basicData.onBooleanFieldChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === false);
  assert(oldValue === undefined);
};
basicData.booleanField = false;
assert(count === 1);
assert(count2 === 1);

count2 = 0;
let observableArray = new ObservableArray<number>();
basicData.onNumberArrayFieldChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === observableArray);
  assert(oldValue === undefined);
};
basicData.numberArrayField = observableArray;
assert(count === 2)
assert(count2 === 1);;

observableArray.push(10);
assert(count === 3)

let dataWithComment = new DataWithComment();
dataWithComment.stringField = 'a string';
dataWithComment.stringArrayField = new ObservableArray<string>();
dataWithComment.booleanArrayField = new ObservableArray<boolean>();
