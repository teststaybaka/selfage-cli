import { generateMessage } from "./message_generation_deprecated";
import { spawnSync } from "child_process";
import { writeFileSync } from "fs";
import { newInternalError } from "selfage/errors";
import {
  TestCase,
  TestSet,
  assert,
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

class GenerateMessageCompilationError implements TestCase {
  public name = "GenerateMessageCompilationError";

  public async execute() {
    let error = assertThrow(() =>
      generateMessage("./test_data/test_message_error_msg", "selfage")
    );
    assertError(error, newInternalError("Failed to compile"));
  }
}

function verifyGeneratedMessage(
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
    assert(content.includes(text), `${text} to be found.`);
  }
  for (let text of textsToExclude) {
    assert(!content.includes(text), `${text} to be not found.`);
  }
  // Use `tsc` to check if generated messages contain any syntax or type error
  // and can be properly imported in the corresponding prober module. Execute
  // the verifier to verify if generated functions work properly.
  let verifierModule = testTargetModule.replace(/_msg$/, "_verifier");
  let compilingRes = spawnSync(
    "npx",
    [
      "tsc",
      "--noImplicitAny",
      "--sourceMap",
      "-t",
      "es5",
      verifierModule + ".ts",
    ],
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
    verifyGeneratedMessage(
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
    verifyGeneratedMessage("./test_data/test_message_nested_msg");
  }
}

/**
 * Covers parsing messages extened from other messages.
 */
class GenerateExtendedMessages implements TestCase {
  public name = "GenerateExtendedMessages";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_message_extended_msg");
  }
}

/**
 * Covers parsing messages extended imported messages, and messages containing
 * nested messages which are imported.
 */
class GenerateImportedMessages implements TestCase {
  public name = "GenerateImportedMessages";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_message_imported_msg", [
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
    verifyGeneratedMessage("./test_data/test_message_field_extended_msg", [
      "./test_data/test_message_basic_msg",
      "./test_data/test_message_imported_msg",
    ]);
  }
}

/**
 * Covers parsing observable messages with basic types and preserving comments.
 */
class GenerateBasicObservables implements TestCase {
  public name = "GenerateBasicObservables";

  public async execute() {
    verifyGeneratedMessage(
      "./test_data/test_observable_basic_msg",
      [],
      ["// Comment1", "// Comment2", "// Comment3", "* Comment4", "* Comment5"]
    );
  }
}

/**
 * Covers parsing observable messages with nested observable message.
 **/
class GenerateNestedObservables implements TestCase {
  public name = "GenerateNestedObservables";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_observable_nested_msg");
  }
}

/**
 * Covers parsing observable messages with imported observable message.
 **/
class GenerateImportedObservables implements TestCase {
  public name = "GenerateImportedObservables";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_observable_imported_msg", [
      "./test_data/test_observable_basic_msg",
    ]);
  }
}

export let MESSAGE_GENERATION_TEST: TestSet = {
  name: "MessageGenerationTest",
  cases: [
    new GenerateMessageErrorWithoutSuffix(),
    new GenerateMessageCompilationError(),
    new GenerateBasicMessages(),
    new GenerateNestedMessages(),
    new GenerateExtendedMessages(),
    new GenerateImportedMessages(),
    new GenerateFieldExtendedMessages(),
    new GenerateBasicObservables(),
    new GenerateNestedObservables(),
    new GenerateImportedObservables(),
  ],
};
