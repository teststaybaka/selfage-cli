import fs = require("fs");
import { bundle } from "./build";
import { spawnSync } from "child_process";
import { Expectation, TestCase, runTests } from "selfage/test_base";

// Simple tests only verifying files generated or not. Functional tests requires
// setting up local automated browser testing environment.

function compileTypeScript(filePath: string) {
  spawnSync("npx", ["tsc", "--inlineSourceMap", "--inlineSources", filePath], {
    stdio: "inherit",
  });
}

function cleanupCompiledAndBundles() {
  fs.unlinkSync("./test_data/bundle_test/main.js");
  fs.unlinkSync("./test_data/bundle_test/lib_foo.js");
  fs.unlinkSync("./test_data/bundle_test/lib_bar.js");
  fs.unlinkSync("./test_data/bundle_test/main.bundleinfo");
  fs.unlinkSync("./test_data/bundle_test/main.bundle");
  fs.unlinkSync("./test_data/bundle_test/main.bundle.tar.gz");
}

class FileNotExits implements TestCase {
  public name = "FileNotExists";

  public async execute() {
    // Execute
    await bundle("test_data/bundle_tests/no_such_file");

    // Verify
    // No error.
  }
}

class BundleForTheFirstTime implements TestCase {
  public name = "BundleForTheFirstTime";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");

    // Execute
    await bundle("./test_data/bundle_test/url_to_bundles.json");

    // Verify
    Expectation.expect(fs.existsSync("./test_data/bundle_test/main.bundle"));
    Expectation.expect(
      fs.existsSync("./test_data/bundle_test/main.bundle.tar.gz")
    );

    cleanupCompiledAndBundles();
  }
}

class SkipBundlingWithoutChanges implements TestCase {
  public name = "SkipBundlingWithoutChanges";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");
    await bundle("./test_data/bundle_test/url_to_bundles.json");
    let mtime = fs.statSync("./test_data/bundle_test/main.bundle").mtimeMs;

    // Execute
    await bundle("./test_data/bundle_test/url_to_bundles.json");

    // Verify
    try {
      let mtimeActual = fs.statSync("./test_data/bundle_test/main.bundle")
        .mtimeMs;
      Expectation.expect(mtimeActual === mtime);
    } finally {
      cleanupCompiledAndBundles();
    }
  }
}

class BundleAfterModifyingMainFile implements TestCase {
  public name = "BundleAfterModifyingMainFile";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");
    await bundle("./test_data/bundle_test/url_to_bundles.json");
    let mtime = fs.statSync("./test_data/bundle_test/main.bundle").mtimeMs;
    let backupContent = fs.readFileSync("./test_data/bundle_test/main.ts");
    fs.copyFileSync(
      "./test_data/bundle_test/main_modified.ts",
      "./test_data/bundle_test/main.ts"
    );
    compileTypeScript("./test_data/bundle_test/main.ts");

    // Execute
    await bundle("./test_data/bundle_test/url_to_bundles.json");

    // Verify
    try {
      let mtimeActual = fs.statSync("./test_data/bundle_test/main.bundle")
        .mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      cleanupCompiledAndBundles();
      fs.writeFileSync("./test_data/bundle_test/main.ts", backupContent);
    }
  }
}

class BundleAfterModifyingOneDependency implements TestCase {
  public name = "BundleAfterModifyingOneDependency";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");
    await bundle("./test_data/bundle_test/url_to_bundles.json");
    let mtime = fs.statSync("./test_data/bundle_test/main.bundle").mtimeMs;
    let backupContent = fs.readFileSync("./test_data/bundle_test/lib_foo.ts");
    fs.copyFileSync(
      "./test_data/bundle_test/lib_foo_modified.ts",
      "./test_data/bundle_test/lib_foo.ts"
    );
    compileTypeScript("./test_data/bundle_test/main.ts");

    // Execute
    await bundle("./test_data/bundle_test/url_to_bundles.json");

    // Verify
    try {
      let mtimeActual = fs.statSync("./test_data/bundle_test/main.bundle")
        .mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      cleanupCompiledAndBundles();
      fs.writeFileSync("./test_data/bundle_test/lib_foo.ts", backupContent);
    }
  }
}

runTests("BuilderTest", [
  new FileNotExits(),
  new BundleForTheFirstTime(),
  new SkipBundlingWithoutChanges(),
  new BundleAfterModifyingMainFile(),
  new BundleAfterModifyingOneDependency(),
]);
