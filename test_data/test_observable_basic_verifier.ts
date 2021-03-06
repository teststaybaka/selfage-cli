import {
  BASIC_DATA,
  BasicData,
  DATA_WITH_COMMENT,
  DataWithComment,
} from "./test_observable_basic";
import { PrimitiveType } from "selfage/message_descriptor";
import { ObservableArray } from "selfage/observable_array";
import { assert } from "selfage/test_base";

assert(BASIC_DATA.name === "BasicData");
assert(BASIC_DATA.fields.length === 3);
assert(BASIC_DATA.fields[0].name === "booleanField");
assert(BASIC_DATA.fields[0].primitiveType === PrimitiveType.BOOLEAN);
assert(BASIC_DATA.fields[0].observableArrayFactoryFn === undefined);
assert(BASIC_DATA.fields[1].name === "numberField");
assert(BASIC_DATA.fields[1].primitiveType === PrimitiveType.NUMBER);
assert(BASIC_DATA.fields[1].observableArrayFactoryFn === undefined);
assert(BASIC_DATA.fields[2].name === "numberArrayField");
assert(BASIC_DATA.fields[2].primitiveType === PrimitiveType.NUMBER);
assert(BASIC_DATA.fields[2].observableArrayFactoryFn !== undefined);

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
basicData.onNumberFieldChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === 3);
  assert(oldValue === undefined);
};
basicData.numberField = 3;
assert(count === 2);
assert(count2 === 1);

count2 = 0;
let observableArray = BASIC_DATA.fields[2].observableArrayFactoryFn();
basicData.onNumberArrayFieldChange = (newValue, oldValue) => {
  count2++;
  assert(newValue === observableArray);
  assert(oldValue === undefined);
};
basicData.numberArrayField = observableArray;
assert(count === 3);
assert(count2 === 1);

observableArray.push(10);
assert(count === 4);

let serialized = JSON.stringify(basicData);
assert(serialized === `{"booleanField":false,"numberField":3,"numberArrayField":[10]}`);

assert(DATA_WITH_COMMENT.name === "DataWithComment");
assert(DATA_WITH_COMMENT.fields.length === 3);
assert(DATA_WITH_COMMENT.fields[0].name === "stringField");
assert(
  DATA_WITH_COMMENT.fields[0].primitiveType === PrimitiveType.STRING
);
assert(
  DATA_WITH_COMMENT.fields[0].observableArrayFactoryFn === undefined
);
assert(DATA_WITH_COMMENT.fields[1].name === "stringArrayField");
assert(
  DATA_WITH_COMMENT.fields[1].primitiveType === PrimitiveType.STRING
);
assert(
  DATA_WITH_COMMENT.fields[1].observableArrayFactoryFn !== undefined
);
assert(DATA_WITH_COMMENT.fields[2].name === "booleanArrayField");
assert(
  DATA_WITH_COMMENT.fields[2].primitiveType === PrimitiveType.BOOLEAN
);
assert(
  DATA_WITH_COMMENT.fields[2].observableArrayFactoryFn !== undefined
);

let dataWithComment = new DataWithComment();
dataWithComment.stringField = "a string";
dataWithComment.stringArrayField = new ObservableArray<string>();
dataWithComment.booleanArrayField = new ObservableArray<boolean>();
