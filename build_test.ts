import fs = require("fs");
import { bundleUrl } from "./build";
import { spawnSync } from "child_process";
import { Expectation, TestCase, runTests } from "selfage/test_base";

// Simple tests only verifying files generated or not. Functional tests requires
// setting up local automated browser testing environment.

function compileTypeScript(filePath: string) {
  spawnSync("npx", ["tsc", "--inlineSourceMap", "--inlineSources", filePath], {
    stdio: "inherit",
  });
}

function cleanupCompiledAndBundleUrls() {
  fs.unlinkSync("./test_data/bundle_test/main.js");
  fs.unlinkSync("./test_data/bundle_test/lib_foo.js");
  fs.unlinkSync("./test_data/bundle_test/lib_bar.js");
  fs.unlinkSync("./test_data/bundle_test/main.bundleinfo");
  fs.unlinkSync("./test_data/bundle_test/main.html");
  fs.unlinkSync("./test_data/bundle_test/main.html.tar.gz");
}

class BundleUrlFileNotExits implements TestCase {
  public name = "BundleUrlFileNotExists";

  public async execute() {
    // Execute
    await bundleUrl("test_data/bundle_tests/no_such_file");

    // Verify
    // No error.
  }
}

class BundleUrlForTheFirstTime implements TestCase {
  public name = "BundleUrlForTheFirstTime";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");

    // Execute
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");

    // Verify
    Expectation.expect(fs.existsSync("./test_data/bundle_test/main.html"));
    Expectation.expect(
      fs.existsSync("./test_data/bundle_test/main.html.tar.gz")
    );

    cleanupCompiledAndBundleUrls();
  }
}

class BundleUrlSkipBundlingWithoutChanges implements TestCase {
  public name = "BundleUrlSkipBundlingWithoutChanges";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");
    let mtime = fs.statSync("./test_data/bundle_test/main.html").mtimeMs;

    // Execute
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");

    // Verify
    try {
      let mtimeActual = fs.statSync("./test_data/bundle_test/main.html")
        .mtimeMs;
      Expectation.expect(mtimeActual === mtime);
    } finally {
      cleanupCompiledAndBundleUrls();
    }
  }
}

class BundleUrlAfterModifyingMainFile implements TestCase {
  public name = "BundleUrlAfterModifyingMainFile";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");
    let mtime = fs.statSync("./test_data/bundle_test/main.html").mtimeMs;
    let backupContent = fs.readFileSync("./test_data/bundle_test/main.ts");
    fs.copyFileSync(
      "./test_data/bundle_test/main_modified.ts",
      "./test_data/bundle_test/main.ts"
    );
    compileTypeScript("./test_data/bundle_test/main.ts");

    // Execute
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");

    // Verify
    try {
      let mtimeActual = fs.statSync("./test_data/bundle_test/main.html")
        .mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      cleanupCompiledAndBundleUrls();
      fs.writeFileSync("./test_data/bundle_test/main.ts", backupContent);
    }
  }
}

class BundleUrlAfterModifyingOneDependency implements TestCase {
  public name = "BundleUrlAfterModifyingOneDependency";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");
    let mtime = fs.statSync("./test_data/bundle_test/main.html").mtimeMs;
    let backupContent = fs.readFileSync("./test_data/bundle_test/lib_foo.ts");
    fs.copyFileSync(
      "./test_data/bundle_test/lib_foo_modified.ts",
      "./test_data/bundle_test/lib_foo.ts"
    );
    compileTypeScript("./test_data/bundle_test/main.ts");

    // Execute
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");

    // Verify
    try {
      let mtimeActual = fs.statSync("./test_data/bundle_test/main.html")
        .mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      cleanupCompiledAndBundleUrls();
      fs.writeFileSync("./test_data/bundle_test/lib_foo.ts", backupContent);
    }
  }
}

runTests("BuildTest", [
  new BundleUrlFileNotExits(),
  new BundleUrlForTheFirstTime(),
  new BundleUrlSkipBundlingWithoutChanges(),
  new BundleUrlAfterModifyingMainFile(),
  new BundleUrlAfterModifyingOneDependency(),
]);
