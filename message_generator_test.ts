import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { TestCase, runTests } from "selfage/test_base";
import { MessageGenerator } from "./message_generator";

function parameterizedTest(
  testTargetModule: string,
  modulesImported: string[] = []
) {
  // Prepare
  let originalContents: Map<string, Buffer> = new Map();
  for (let modulePath of modulesImported) {
    let filePath = modulePath + ".ts";
    let originalContent = readFileSync(filePath);
    originalContents.set(filePath, originalContent);
    new MessageGenerator(filePath, false).generate();
  }
  let filePath = testTargetModule + ".ts";
  let originalContent = readFileSync(filePath);
  originalContents.set(filePath, originalContent);

  // Execute
  new MessageGenerator(filePath, false).generate();

  // Verify
  try {
    // Use `tsc` to check if generated messages contain any syntax error and can
    // be properly imported in the corresponding prober module. Execute the
    // prober which tests if generated functions work properly.
    execSync(
      `tsc --noUnusedLocals --noImplicitAny ` +
        `${testTargetModule}_prober.ts; node ` +
        `${testTargetModule}_prober.js;`,
      { encoding: "utf-8" }
    );
  } finally {
    // Cleanup
    for (let entry of originalContents.entries()) {
      writeFileSync(entry[0], entry[1]);
    }
  }
}

/**
 * Covers making fields optional and interfaces exported, correctly parsing
 * JSON data, and excluding unwanted fields.
 */
class GenerateBasicMessages implements TestCase {
  public name = "GenerateBasicMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_basic");
  }
}

/**
 * Covers parsing messages containing nested messages.
 */
class GenerateNestedMessages implements TestCase {
  public name = "GenerateNestedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_nested");
  }
}

/**
 * Covers parsing messages extened from other messages.
 */
class GenerateExtendedMessages implements TestCase {
  public name = "GenerateExtendedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_extended");
  }
}

/**
 * Covers parsing messages extended imported messages, and messages containing
 * nested messages which are imported.
 */
class GenerateImportedMessages implements TestCase {
  public name = "GenerateImportedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_imported", [
      "./test_data/test_message_basic",
    ]);
  }
}

/**
 * Covers parsing messages extended imported messages, and messages containing nested messages which are imported.
 */
class GenerateFieldExtendedMessages implements TestCase {
  public name = "GenerateFieldExtendedMessages";

  public async execute() {
    parameterizedTest("./test_data/test_message_field_extended", [
      "./test_data/test_message_basic",
      "./test_data/test_message_imported",
    ]);
  }
}

runTests("MessageGeneratorTest", [
  new GenerateBasicMessages(),
  new GenerateNestedMessages(),
  new GenerateExtendedMessages(),
  new GenerateImportedMessages(),
  new GenerateFieldExtendedMessages(),
]);
