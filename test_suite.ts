import { BUILD_TEST } from "./build_test";
import { MESSAGE_GENERATOR_TEST } from "./message_generator_test";
import { runTests } from "selfage/test_runner";

runTests([MESSAGE_GENERATOR_TEST, BUILD_TEST]);
