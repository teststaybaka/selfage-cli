import { generateMessage } from "./message_generation";
import { spawnSync } from "child_process";
import { writeFileSync } from "fs";
import { newInternalError } from "selfage/errors";
import {
  Expectation,
  TestCase,
  TestSet,
  assertError,
  assertThrow,
} from "selfage/test_base";

class GenerateMessageErrorWithoutSuffix implements TestCase {
  public name = "GenerateMessageErrorWithoutSuffix";

  public async execute() {
    let error = assertThrow(() =>
      generateMessage("./test_data/test_message_basic", "selfage")
    );
    assertError(error, newInternalError("must end with"));
  }
}

function parameterizedTest(
  testTargetModule: string,
  modulesImported: string[] = [],
  textsToMatch: string[] = [],
  textsToExclude: string[] = []
) {
  // Prepare
  let generatedFiles = new Array<string>();
  for (let modulePath of modulesImported) {
    let { filename, content } = generateMessage(modulePath, "selfage");
    writeFileSync(filename, content);
    generatedFiles.push(filename);
  }

  // Execute
  let { filename, content } = generateMessage(testTargetModule, "selfage");
  writeFileSync(filename, content);
  generatedFiles.push(filename);

  // Verify
  for (let text of textsToMatch) {
    Expectation.expect(content.includes(text), `${text} to be found.`);
  }
  for (let text of textsToExclude) {
    Expectation.expect(!content.includes(text), `${text} to be not found.`);
  }
  // Use `tsc` to check if generated messages contain any syntax or type error
  // and can be properly imported in the corresponding prober module. Execute
  // the verifier to verify if generated functions work properly.
  let verifierModule = testTargetModule.replace(/_msg$/, "");
  let compilingRes = spawnSync(
    "npx",
    ["tsc", "--noImplicitAny", "--sourceMap", verifierModule + ".ts"],
    { stdio: "inherit" }
  );
  if (compilingRes.status !== 0) {
    throw new Error("Compiling error.");
  }
  let executeRes = spawnSync("node", [verifierModule + ".js"], {
    stdio: "inherit",
  });
  if (executeRes.status !== 0) {
    throw new Error("Execution error.");
  }
}

/**
 * Covers making fields optional, making interfaces exported, parsing object,
 * excluding unwanted fields from object, and preserving comments.
 */
class GenerateBasicMessages implements TestCase {
  public name = "GenerateBasicMessages";

  public async execute() {
    parameterizedTest(
      "./test_data/test_message_basic_msg",
      [],
      [
        "// Comment1",
        "// Comment2",
        "// Comment3",
        "// Comment4",
        "// Comment5",
      ],
      ["// Ignored"]
    );
  }
}

/**
 * Covers parsing messages containing nested messages.
 */
class GenerateNestedMessages implements TestCase {
  public name = "GenerateNestedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_nested_msg");
  }
}

/**
 * Covers parsing messages extened from other messages.
 */
class GenerateExtendedMessages implements TestCase {
  public name = "GenerateExtendedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_extended_msg");
  }
}

/**
 * Covers parsing messages extended imported messages, and messages containing
 * nested messages which are imported.
 */
class GenerateImportedMessages implements TestCase {
  public name = "GenerateImportedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_imported_msg", [
      "./test_data/test_message_basic_msg",
    ]);
  }
}

/**
 * Covers parsing messages extended imported messages, and messages containing
 * nested messages which are imported.
 */
class GenerateFieldExtendedMessages implements TestCase {
  public name = "GenerateFieldExtendedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_field_extended_msg", [
      "./test_data/test_message_basic_msg",
      "./test_data/test_message_imported_msg",
    ]);
  }
}

export let MESSAGE_GENERATION_TEST: TestSet = {
  name: "MessageGenerationTest",
  cases: [
    new GenerateMessageErrorWithoutSuffix(),
    new GenerateBasicMessages(),
    new GenerateNestedMessages(),
    new GenerateExtendedMessages(),
    new GenerateImportedMessages(),
    new GenerateFieldExtendedMessages(),
  ],
};
