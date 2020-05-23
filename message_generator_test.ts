import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { TestCase, runTests } from "selfage/test_base";
import { MessageGenerator } from "./message_generator";

class GenerateMessageWithinSameFile implements TestCase {
  public name = "GenerateMessagesWithinSameFile";

  public async execute() {
    // Prepare
    let filePath = "./test_data/test_interface.ts";
    let originalContent = readFileSync(filePath);

    // Execute
    new MessageGenerator(filePath, true).generate();

    // Verify
    try {
      execSync(`tsc ${filePath}`, { encoding: "utf-8" });
    } finally {
      writeFileSync(filePath, originalContent);
    }
  }
}

class GenerateMessageWithNestedField implements TestCase {
  public name = "GenerateMessageWithNestedField";

  public async execute() {
    // Prepare
    let filePath = "./test_data/test_interface.ts";
    let originalContent = readFileSync(filePath);
    new MessageGenerator(filePath, true).generate();
    let filePathAnother = "./test_data/test_interface_another.ts";
    let originalContentAnother = readFileSync(filePathAnother);

    // Execute
    new MessageGenerator(filePathAnother, true).generate();

    // Verify
    try {
      execSync(`tsc ${filePathAnother}`, { encoding: "utf-8" });
    } finally {
      writeFileSync(filePath, originalContent);
      writeFileSync(filePathAnother, originalContentAnother);
    }
  }
}

runTests("MessageGeneratorTest", [
  new GenerateMessageWithinSameFile(),
  new GenerateMessageWithNestedField(),
]);
