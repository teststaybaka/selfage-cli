import { BASIC_DATA_MODEL } from "./test_datastore_imported_no_index";
import { BASIC_DATA } from "./test_message_basic";
import { assert } from "selfage/test_base";

assert(BASIC_DATA_MODEL.name === "BasicData");
assert(BASIC_DATA_MODEL.key === "numberField");
assert(BASIC_DATA_MODEL.valueDescriptor === BASIC_DATA);
