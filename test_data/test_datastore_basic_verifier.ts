import {
  BASIC_DATA,
  BASIC_DATA_MODEL,
  NumberBooleanQueryBuilder,
  NumberQueryBuilder,
} from "./test_datastore_basic";
import { assert } from "selfage/test_base";

assert(BASIC_DATA_MODEL.name === "BasicData");
assert(BASIC_DATA_MODEL.key === "stringField");
assert(BASIC_DATA_MODEL.excludedIndexes.length === 2);
assert(BASIC_DATA_MODEL.excludedIndexes[0] === "stringField");
assert(BASIC_DATA_MODEL.excludedIndexes[1] === "booleanField");
assert(BASIC_DATA_MODEL.valueDescriptor === BASIC_DATA);

let numberBooleanQuery = new NumberBooleanQueryBuilder()
  .start("token")
  .limit(100)
  .filterByNumberField("<", 123)
  .filterByNumberField(">", 10)
  .filterByBooleanArrayField("=", true)
  .build();
assert(numberBooleanQuery.startToken === "token");
assert(numberBooleanQuery.limit === 100);
assert(numberBooleanQuery.orderings.length === 1);
assert(numberBooleanQuery.orderings[0].indexName === "numberField");
assert(numberBooleanQuery.orderings[0].descending === false);
assert(numberBooleanQuery.filters.length === 3);
assert(numberBooleanQuery.filters[0].indexName === "numberField");
assert(numberBooleanQuery.filters[0].indexValue === 123);
assert(numberBooleanQuery.filters[0].operator === "<");
assert(numberBooleanQuery.filters[1].indexName === "numberField");
assert(numberBooleanQuery.filters[1].indexValue === 10);
assert(numberBooleanQuery.filters[1].operator === ">");
assert(numberBooleanQuery.filters[2].indexName === "booleanArrayField");
assert(numberBooleanQuery.filters[2].indexValue === true);
assert(numberBooleanQuery.filters[2].operator === "=");

let numberQuery = new NumberQueryBuilder().filterByNumberField(">", 20).build();
assert(numberQuery.startToken === undefined);
assert(numberQuery.limit === undefined);
assert(numberQuery.orderings.length === 1);
assert(numberQuery.orderings[0].indexName === "numberField");
assert(numberQuery.orderings[0].descending === true);
assert(numberQuery.filters.length === 1);
assert(numberQuery.filters[0].indexName === "numberField");
assert(numberQuery.filters[0].indexValue === 20);
assert(numberQuery.filters[0].operator === ">");
