import fs = require("fs");
import {
  buildChromeExtension,
  buildWeb,
  clean,
  packChromeExtension,
} from "./build";
import { spawnSync } from "child_process";
import { Expectation, TestCase, assert, runTests } from "selfage/test_base";

function compileTypeScript(...files: string[]) {
  spawnSync("npx", ["tsc", "--inlineSourceMap", "--inlineSources", ...files], {
    stdio: "inherit",
  });
}

async function unlinkFiles(...files: string[]) {
  try {
    let promisesToUnlink = files.map(
      (file): Promise<void> => {
        return fs.promises.unlink(file);
      }
    );
    await Promise.all(promisesToUnlink);
  } catch (e) {
    // We might clean up more files then needed, thus causing errors.
  }
}

async function cleanupBuilt() {
  await unlinkFiles(
    "./test_data/build_web/main.js",
    "./test_data/build_web/lib_foo.js",
    "./test_data/build_web/lib_bar.js",
    "./test_data/build_web/main.filemtime",
    "./test_data/build_web/main.html",
    "./test_data/build_web/main.html.gz"
  );
}

class BuildWebForTheFirstTime implements TestCase {
  public name = "BuildWebForTheFirstTime";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/build_web/main.ts");

    // Execute
    await buildWeb("./test_data/build_web");

    // Verify
    Expectation.expect(fs.existsSync("./test_data/build_web/main.html"));
    Expectation.expect(fs.existsSync("./test_data/build_web/main.html.gz"));

    // Cleanup
    await cleanupBuilt();
  }
}

class BuildWebSkipBundlingWithoutChanges implements TestCase {
  public name = "BuildWebSkipBundlingWithoutChanges";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/build_web/main.ts");
    await buildWeb("./test_data/build_web");
    let mtime = fs.statSync("./test_data/build_web/main.html").mtimeMs;

    // Execute
    await buildWeb("./test_data/build_web");

    // Verify
    try {
      assert(fs.existsSync("./test_data/build_web/main.html"));
      let mtimeActual = fs.statSync("./test_data/build_web/main.html").mtimeMs;
      Expectation.expect(mtimeActual === mtime);
    } finally {
      // Cleanup
      await cleanupBuilt();
    }
  }
}

class BuildWebAfterModifyingMainFile implements TestCase {
  public name = "BuildWebAfterModifyingMainFile";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/build_web/main.ts");
    await buildWeb("./test_data/build_web");
    let mtime = fs.statSync("./test_data/build_web/main.html").mtimeMs;
    let backupMain = fs.readFileSync("./test_data/build_web/main.ts");
    fs.copyFileSync(
      "./test_data/build_web/main_modified.ts",
      "./test_data/build_web/main.ts"
    );
    compileTypeScript("./test_data/build_web/main.ts");

    // Execute
    await buildWeb("./test_data/build_web");

    // Verify
    try {
      assert(fs.existsSync("./test_data/build_web/main.html"));
      let mtimeActual = fs.statSync("./test_data/build_web/main.html").mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      // Cleanup
      fs.writeFileSync("./test_data/build_web/main.ts", backupMain);
      await cleanupBuilt();
    }
  }
}

class BuildWebAfterModifyingOneDependency implements TestCase {
  public name = "BuildWebAfterModifyingOneDependency";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/build_web/main.ts");
    await buildWeb("./test_data/build_web");
    let mtime = fs.statSync("./test_data/build_web/main.html").mtimeMs;
    let backupLibFoo = fs.readFileSync("./test_data/build_web/lib_foo.ts");
    fs.copyFileSync(
      "./test_data/build_web/lib_foo_modified.ts",
      "./test_data/build_web/lib_foo.ts"
    );
    compileTypeScript("./test_data/build_web/main.ts");

    // Execute
    await buildWeb("./test_data/build_web");

    // Verify
    try {
      assert(fs.existsSync("./test_data/build_web/main.html"));
      let mtimeActual = fs.statSync("./test_data/build_web/main.html").mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      // Cleanup
      fs.writeFileSync("./test_data/build_web/lib_foo.ts", backupLibFoo);
      await cleanupBuilt();
    }
  }
}

class BuildWebAfterRemovingOneDependency implements TestCase {
  public name = "BuildWebAfterRemovingOneDependency";

  public async execute() {
    // Prepare
    compileTypeScript("./test_data/build_web/main.ts");
    await buildWeb("./test_data/build_web");
    let mtime = fs.statSync("./test_data/build_web/main.html").mtimeMs;
    let backupMain = fs.readFileSync("./test_data/build_web/main.ts");
    let backupLibFoo = fs.readFileSync("./test_data/build_web/lib_foo.ts");
    fs.copyFileSync(
      "./test_data/build_web/main_removed_deps.ts",
      "./test_data/build_web/main.ts"
    );
    fs.unlinkSync("./test_data/build_web/lib_foo.ts");
    compileTypeScript("./test_data/build_web/main.ts");

    // Execute
    await buildWeb("./test_data/build_web");

    // Verify
    try {
      assert(fs.existsSync("./test_data/build_web/main.html"));
      let mtimeActual = fs.statSync("./test_data/build_web/main.html").mtimeMs;
      Expectation.expect(mtimeActual > mtime);
    } finally {
      // Cleanup
      fs.writeFileSync("./test_data/build_web/lib_foo.ts", backupLibFoo);
      fs.writeFileSync("./test_data/build_web/main.ts", backupMain);
      await cleanupBuilt();
    }
  }
}

function compileChromeExtension() {
  compileTypeScript(
    "./test_data/build_chrome_extension/browser_action/main",
    "./test_data/build_chrome_extension/background/main",
    "./test_data/build_chrome_extension/background/main2",
    "./test_data/build_chrome_extension/content_script/main",
    "./test_data/build_chrome_extension/content_script/main2",
    "./test_data/build_chrome_extension/content_script/static_main"
  );
}

async function cleanupChromeExtension() {
  await unlinkFiles(
    "./test_data/build_chrome_extension/browser_action/main.js",
    "./test_data/build_chrome_extension/browser_action/main.filemtime",
    "./test_data/build_chrome_extension/browser_action/main.bundled.html",
    "./test_data/build_chrome_extension/background/main.js",
    "./test_data/build_chrome_extension/background/main.filemtime",
    "./test_data/build_chrome_extension/background/main.bundled.js",
    "./test_data/build_chrome_extension/background/main2.js",
    "./test_data/build_chrome_extension/background/main2.filemtime",
    "./test_data/build_chrome_extension/background/main2.bundled.js",
    "./test_data/build_chrome_extension/content_script/main.js",
    "./test_data/build_chrome_extension/content_script/main.filemtime",
    "./test_data/build_chrome_extension/content_script/main.bundled.js",
    "./test_data/build_chrome_extension/content_script/main2.js",
    "./test_data/build_chrome_extension/content_script/main2.filemtime",
    "./test_data/build_chrome_extension/content_script/main2.bundled.js",
    "./test_data/build_chrome_extension/content_script/static_main.js",
    "./test_data/build_chrome_extension/content_script/static_main.filemtime",
    "./test_data/build_chrome_extension/content_script/static_main.bundled.js",
    "./test_data/build_chrome_extension/manifest.json",
    "./test_data/build_chrome_extension/chrome_extension.zip"
  );
}

class BuildChromeExtesnion implements TestCase {
  public name = "BuildChromeExtesnion";

  public async execute() {
    // Prepare
    compileChromeExtension();

    // Execute
    let { bundledFiles, ignoredFiles } = await buildChromeExtension(
      "./test_data/build_chrome_extension"
    );

    // Verify
    Expectation.expect(bundledFiles.length === 6);
    Expectation.expect(
      bundledFiles[0] ===
        "test_data/build_chrome_extension/background/main.bundle.js"
    );
    Expectation.expect(
      bundledFiles[1] ===
        "test_data/build_chrome_extension/background/main2.bundle.js"
    );
    Expectation.expect(
      bundledFiles[2] ===
        "test_data/build_chrome_extension/content_script/main.bundle.js"
    );
    Expectation.expect(
      bundledFiles[3] ===
        "test_data/build_chrome_extension/content_script/main2.bundle.js"
    );
    Expectation.expect(
      bundledFiles[4] ===
        "test_data/build_chrome_extension/content_script/static_main.bundle.js"
    );
    Expectation.expect(
      bundledFiles[5] ===
        "test_data/build_chrome_extension/browser_action/main.bundle.html"
    );
    Expectation.expect(ignoredFiles.length == 0);
    Expectation.expect(
      fs.existsSync(
        "./test_data/build_chrome_extension/browser_action/main.bundle.html"
      )
    );
    Expectation.expect(
      fs.existsSync(
        "./test_data/build_chrome_extension/background/main.bundle.js"
      )
    );
    Expectation.expect(
      fs.existsSync(
        "./test_data/build_chrome_extension/background/main2.bundle.js"
      )
    );
    Expectation.expect(
      fs.existsSync(
        "./test_data/build_chrome_extension/content_script/main.bundle.js"
      )
    );
    Expectation.expect(
      fs.existsSync(
        "./test_data/build_chrome_extension/content_script/main2.bundle.js"
      )
    );
    Expectation.expect(
      fs.existsSync(
        "./test_data/build_chrome_extension/content_script/static_main.bundle.js"
      )
    );

    try {
      assert(fs.existsSync("./test_data/build_chrome_extension/manifest.json"));
      let manifest = JSON.parse(
        fs
          .readFileSync("./test_data/build_chrome_extension/manifest.json")
          .toString()
      );
      Expectation.expect(manifest.manifest_version === 2);
      Expectation.expect(manifest.version === "2.4.3");
    } finally {
      // Cleanup
      await cleanupChromeExtension();
    }
  }
}

class PackChromeExtension implements TestCase {
  public name = "PackChromeExtension";

  public async execute() {
    // Prepare
    compileChromeExtension();

    // Execute
    await packChromeExtension("./test_data/build_chrome_extension");

    // Verify
    Expectation.expect(
      fs.existsSync("./test_data/build_chrome_extension/chrome_extension.zip")
    );

    // Cleanup
    await cleanupChromeExtension();
  }
}

class CleanCurentDirectory implements TestCase {
  public name = "CleanCurentDirectory";

  public async execute() {
    // Prepare
    let promisesToWrite: Promise<void>[] = [];
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/compiled.ts", "ts")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/compiled.js", "js")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/compiled2.ts", "ts")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/compiled2.js", "js")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/compiled2.gz", "gz")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/compiled2.filemtime", "123")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/manifest.json", "json")
    );
    await Promise.all(promisesToWrite);

    // Execute
    await clean("./test_data");

    // Verify
    Expectation.expect(fs.existsSync("./test_data/compiled.ts"));
    Expectation.expect(!fs.existsSync("./test_data/compiled.js"));
    Expectation.expect(fs.existsSync("./test_data/compiled2.ts"));
    Expectation.expect(!fs.existsSync("./test_data/compiled2.js"));
    Expectation.expect(!fs.existsSync("./test_data/compiled2.gz"));
    Expectation.expect(!fs.existsSync("./test_data/compiled2.filemtime"));
    Expectation.expect(!fs.existsSync("./test_data/manifest.json"));

    // Cleanup
    await unlinkFiles(
      "./test_data/compiled.ts",
      "./test_data/compiled.js",
      "./test_data/compiled2.ts",
      "./test_data/compiled2.js",
      "./test_data/compiled2.gz",
      "./test_data/compiled2.filemtime",
      "./test_data/manifest.json"
    );
  }
}

class CleanRecursiveFiles implements TestCase {
  public name = "CleanRecursiveFiles";

  public async execute() {
    // Prepare
    let promisesToMkdir: Promise<void>[] = [];
    promisesToMkdir.push(fs.promises.mkdir("./test_data/dir"));
    promisesToMkdir.push(fs.promises.mkdir("./test_data/dir1"));
    promisesToMkdir.push(fs.promises.mkdir("./test_data/node_modules"));
    await Promise.all(promisesToMkdir);
    fs.mkdirSync("./test_data/dir/dir2");
    let promisesToWrite: Promise<void>[] = [];
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/dir/compiled.ts", "ts")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/dir/compiled.js", "js")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/dir/dir2/compiled2.ts", "ts")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/dir/dir2/compiled2.js", "js")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/dir1/compiled3.ts", "ts")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/dir1/compiled3.js", "js")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/node_modules/compiled4.ts", "ts")
    );
    promisesToWrite.push(
      fs.promises.writeFile("./test_data/node_modules/compiled4.js", "js")
    );
    await Promise.all(promisesToWrite);

    // Execute
    await clean("./test_data");

    // Verify
    Expectation.expect(fs.existsSync("./test_data/dir/compiled.ts"));
    Expectation.expect(!fs.existsSync("./test_data/dir/compiled.js"));
    Expectation.expect(fs.existsSync("./test_data/dir/dir2/compiled2.ts"));
    Expectation.expect(!fs.existsSync("./test_data/dir/dir2/compiled2.js"));
    Expectation.expect(fs.existsSync("./test_data/dir1/compiled3.ts"));
    Expectation.expect(!fs.existsSync("./test_data/dir1/compiled3.js"));
    Expectation.expect(fs.existsSync("./test_data/node_modules/compiled4.ts"));
    Expectation.expect(fs.existsSync("./test_data/node_modules/compiled4.js"));

    // Cleanup
    await unlinkFiles(
      "./test_data/dir/compiled.ts",
      "./test_data/dir/compiled.js",
      "./test_data/dir/dir2/compiled2.ts",
      "./test_data/dir/dir2/compiled2.js",
      "./test_data/dir1/compiled3.ts",
      "./test_data/dir1/compiled3.js",
      "./test_data/node_modules/compiled4.ts",
      "./test_data/node_modules/compiled4.js"
    );
    fs.rmdirSync("./test_data/dir/dir2");
    let promisesToRmdir: Promise<void>[] = [];
    promisesToRmdir.push(fs.promises.rmdir("./test_data/dir"));
    promisesToRmdir.push(fs.promises.rmdir("./test_data/dir1"));
    promisesToRmdir.push(fs.promises.rmdir("./test_data/node_modules"));
    await Promise.all(promisesToRmdir);
  }
}

// Simple tests only verifying files generated or not. Functional tests requires
// setting up local automated browser testing environment.
runTests("BuildTest", [
  new BuildWebForTheFirstTime(),
  new BuildWebSkipBundlingWithoutChanges(),
  new BuildWebAfterModifyingMainFile(),
  new BuildWebAfterModifyingOneDependency(),
  new BuildWebAfterRemovingOneDependency(),
  new BuildChromeExtesnion(),
  new PackChromeExtension(),
  new CleanCurentDirectory(),
  new CleanRecursiveFiles(),
]);
