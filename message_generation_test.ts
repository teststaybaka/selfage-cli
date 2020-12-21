import { generateMessage } from "./message_generation";
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

function verifyGeneratedMessage(
  testTargetModule: string,
  modulesImported: string[] = [],
  textsToMatch: string[] = []
) {
  // Prepare
  let generatedFiles = new Array<string>();
  for (let modulePath of modulesImported) {
    let content = generateMessage(modulePath, "selfage");
    writeFileSync(modulePath + ".ts", content);
    generatedFiles.push(modulePath + ".ts");
  }

  // Execute
  let content = generateMessage(testTargetModule, "selfage");
  writeFileSync(testTargetModule + ".ts", content);
  generatedFiles.push(testTargetModule + ".ts");

  // Verify
  for (let text of textsToMatch) {
    assert(content.includes(text), `${text} to be found.`);
  }
  // Use `tsc` to check if generated messages contain any syntax or type error
  // and can be properly imported in the corresponding prober module. Execute
  // the verifier to verify if generated functions work properly.
  let verifierModule = testTargetModule + "_verifier";
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
      "./test_data/test_message_basic",
      [],
      ["Comment1", "Comment2", "Comment3", "Comment4", "Comment5"]
    );
  }
}

/**
 * Covers parsing messages containing nested messages.
 */
class GenerateNestedMessages implements TestCase {
  public name = "GenerateNestedMessages";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_message_nested");
  }
}

/**
 * Covers parsing messages extened from other messages.
 */
class GenerateExtendedMessages implements TestCase {
  public name = "GenerateExtendedMessages";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_message_extended");
  }
}

/**
 * Covers parsing messages extended imported messages, and messages containing
 * nested messages which are imported.
 */
class GenerateImportedMessages implements TestCase {
  public name = "GenerateImportedMessages";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_message_imported", [
      "./test_data/test_message_basic",
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
    verifyGeneratedMessage("./test_data/test_message_field_extended", [
      "./test_data/test_message_basic",
      "./test_data/test_message_imported",
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
      "./test_data/test_observable_basic",
      [],
      ["Comment1", "Comment2", "Comment3"]
    );
  }
}

/**
 * Covers parsing observable messages with nested observable message.
 **/
class GenerateNestedObservables implements TestCase {
  public name = "GenerateNestedObservables";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_observable_nested");
  }
}

/**
 * Covers parsing observable messages with imported observable message.
 **/
class GenerateImportedObservables implements TestCase {
  public name = "GenerateImportedObservables";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_observable_imported", [
      "./test_data/test_observable_basic",
    ]);
  }
}

/**
 * Covers when referencing a message not defined.
 **/
class GenerateDatastoreMessageNotFound implements TestCase {
  public name = "GenerateDatastoreMessageNotFound";

  public async execute() {
    let error = assertThrow(() =>
      verifyGeneratedMessage("./test_data/test_datastore_no_message")
    );
    assertError(error, newInternalError("Message definition of"));
  }
}

/**
 * Covers when the key not defined from the referenced message.
 **/
class GenerateDatastoreKeyNotFound implements TestCase {
  public name = "GenerateDatastoreKeyNotFound";

  public async execute() {
    let error = assertThrow(() =>
      verifyGeneratedMessage("./test_data/test_datastore_no_key")
    );
    assertError(error, newInternalError("Datastore key noField is not found"));
  }
}

/**
 * Covers when a boolean key is defined, but it's invalid.
 **/
class GenerateDatastoreBooleanKey implements TestCase {
  public name = "GenerateDatastoreBooleanKey";

  public async execute() {
    let error = assertThrow(() =>
      verifyGeneratedMessage("./test_data/test_datastore_boolean_key")
    );
    assertError(error, newInternalError("key only be a string or a number"));
  }
}

/**
 * Covers when an array key is defined, but it's invalid.
 **/
class GenerateDatastoreArrayKey implements TestCase {
  public name = "GenerateDatastoreArrayKey";

  public async execute() {
    let error = assertThrow(() =>
      verifyGeneratedMessage("./test_data/test_datastore_array_key")
    );
    assertError(error, newInternalError("cannot be an array"));
  }
}

/**
 * Covers when a property to be index is not found from the referenced message.
 **/
class GenerateDatastoreIndexNotFound implements TestCase {
  public name = "GenerateDatastoreIndexNotFound";

  public async execute() {
    let error = assertThrow(() =>
      verifyGeneratedMessage("./test_data/test_datastore_no_index_property")
    );
    assertError(error, newInternalError("Index noField is not defined"));
  }
}

/**
 * Covers generating key, indexes and execluded indexes.
 **/
class GenerateBasicDatastore implements TestCase {
  public name = "GenerateBasicDatastore";

  public async execute() {
    verifyGeneratedMessage(
      "./test_data/test_datastore_basic",
      [],
      ["Comment1"]
    );
  }
}

/**
 * Covers when message is imported and no index is defined.
 **/
class GenerateImportedDatastoreWithoutIndex implements TestCase {
  public name = "GenerateImportedDatastoreWithoutIndex";

  public async execute() {
    verifyGeneratedMessage("./test_data/test_datastore_imported_no_index");
  }
}

export let MESSAGE_GENERATION_TEST: TestSet = {
  name: "MessageGenerationTest",
  cases: [
    new GenerateBasicMessages(),
    new GenerateNestedMessages(),
    new GenerateExtendedMessages(),
    new GenerateImportedMessages(),
    new GenerateFieldExtendedMessages(),
    new GenerateBasicObservables(),
    new GenerateNestedObservables(),
    new GenerateImportedObservables(),
    new GenerateDatastoreMessageNotFound(),
    new GenerateDatastoreKeyNotFound(),
    new GenerateDatastoreBooleanKey(),
    new GenerateDatastoreArrayKey(),
    new GenerateDatastoreIndexNotFound(),
    new GenerateBasicDatastore(),
    new GenerateImportedDatastoreWithoutIndex(),
  ],
};
