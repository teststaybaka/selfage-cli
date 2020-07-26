import { MessageGenerator } from "./message_generator";
import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { TestCase, assert, runTests } from "selfage/test_base";

function parameterizedTest(
  testTargetModule: string,
  modulesImported: string[] = [],
  textsToMatch: string[] = [],
  textsToExclude: string[] = []
) {
  // Prepare
  let originalContents: Map<string, Buffer> = new Map();
  for (let modulePath of modulesImported) {
    let filePath = modulePath + ".ts";
    let originalContent = readFileSync(filePath);
    originalContents.set(filePath, originalContent);
    let contentGenerated = new MessageGenerator(
      originalContent.toString()
    ).generate();
    writeFileSync(filePath, contentGenerated);
  }
  let filePath = testTargetModule + ".ts";
  let originalContent = readFileSync(filePath);
  originalContents.set(filePath, originalContent);

  // Execute
  let contentGenerated = new MessageGenerator(
    originalContent.toString()
  ).generate();
  writeFileSync(filePath, contentGenerated);

  // Verify
  try {
    for (let text of textsToMatch) {
      assert(contentGenerated.includes(text), `${text} is not found.`);
    }
    for (let text of textsToExclude) {
      assert(!contentGenerated.includes(text), `${text} is found.`);
    }
    // Use `tsc` to check if generated messages contain any syntax or type error
    // and can be properly imported in the corresponding prober module. Execute
    // the verifier to verify if generated functions work properly.
    let compilingRes = spawnSync(
      "npx",
      [
        "tsc",
        "--noUnusedLocals",
        "--noImplicitAny",
        "--sourceMap",
        testTargetModule + "_verifier.ts",
      ],
      { stdio: "inherit" }
    );
    if (compilingRes.status !== 0) {
      throw new Error("Compiling error.");
    }
    let executeRes = spawnSync("node", [testTargetModule + "_verifier.js"], {
      stdio: "inherit",
    });
    if (executeRes.status !== 0) {
      throw new Error("Execution error.");
    }
  } finally {
    // Cleanup
    for (let entry of originalContents.entries()) {
      writeFileSync(entry[0], entry[1]);
    }
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
      "./test_data/test_message_basic",
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
