import { BUILD_TEST } from "./build_test";
import { MESSAGE_GENERATION_TEST } from "./message_generation_test";
import { runTests } from "selfage/test_runner";

runTests([MESSAGE_GENERATION_TEST, BUILD_TEST]);
