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

async function cleanupCompiledAndBundleUrls() {
  let promisesToUnlink: Promise<void>[] = [];
  promisesToUnlink.push(fs.promises.unlink("./test_data/bundle_test/main.js"));
  promisesToUnlink.push(
    fs.promises.unlink("./test_data/bundle_test/lib_foo.js")
  );
  promisesToUnlink.push(
    fs.promises.unlink("./test_data/bundle_test/lib_bar.js")
  );
  promisesToUnlink.push(
    fs.promises.unlink("./test_data/bundle_test/main.filemtime")
  );
  promisesToUnlink.push(
    fs.promises.unlink("./test_data/bundle_test/main.html")
  );
  promisesToUnlink.push(
    fs.promises.unlink("./test_data/bundle_test/main.html.tar.gz")
  );
  try {
    await Promise.all(promisesToUnlink);
  } catch (e) {
    // Might delete more than needed.
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

    await cleanupCompiledAndBundleUrls();
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
      await cleanupCompiledAndBundleUrls();
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
    let backupMain = fs.readFileSync("./test_data/bundle_test/main.ts");
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
      fs.writeFileSync("./test_data/bundle_test/main.ts", backupMain);
      await cleanupCompiledAndBundleUrls();
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
    let backupLibFoo = fs.readFileSync("./test_data/bundle_test/lib_foo.ts");
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
      fs.writeFileSync("./test_data/bundle_test/lib_foo.ts", backupLibFoo);
      await cleanupCompiledAndBundleUrls();
    }
  }
}

class BundleUrlAfterRemovingOneDependency implements TestCase {
  public name = "BundleUrlAfterRemovingOneDependency";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/bundle_test/main.ts");
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");
    let mtime = fs.statSync("./test_data/bundle_test/main.html").mtimeMs;
    let backupMain = fs.readFileSync("./test_data/bundle_test/main.ts");
    let backupLibFoo = fs.readFileSync("./test_data/bundle_test/lib_foo.ts");
    fs.copyFileSync(
      "./test_data/bundle_test/main_removed_deps.ts",
      "./test_data/bundle_test/main.ts"
    );
    fs.unlinkSync("./test_data/bundle_test/lib_foo.ts");
    compileTypeScript("./test_data/bundle_test/main.ts");

    // Execute
    await bundleUrl("./test_data/bundle_test/url_to_modules.json");

    // Verify
    try {
      let mtimeActual = fs.statSync("./test_data/bundle_test/main.html")
        .mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      fs.writeFileSync("./test_data/bundle_test/lib_foo.ts", backupLibFoo);
      fs.writeFileSync("./test_data/bundle_test/main.ts", backupMain);
      await cleanupCompiledAndBundleUrls();
    }
  }
}

runTests("BuildTest", [
  new BundleUrlForTheFirstTime(),
  new BundleUrlSkipBundlingWithoutChanges(),
  new BundleUrlAfterModifyingMainFile(),
  new BundleUrlAfterModifyingOneDependency(),
  new BundleUrlAfterRemovingOneDependency(),
]);
