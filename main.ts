#!/usr/bin/env node
import fs = require("fs");
import path = require("path");
import prettier = require("prettier");
import {
  CHROME_EXTENSION_MANIFEST_NAME,
  CHROME_EXTENSION_PACKAGE_NAME,
  build,
  buildChromeExtension,
  buildUrl,
  clean,
  packChromeExtension,
} from "./build";
import { ImportsSorter } from "./imports_sorter";
import { MessageGenerator } from "./message_generator";
import { spawnSync } from "child_process";
import { Command } from "commander";
import { URL_TO_MODULES_CONFIG_FILE } from "selfage/common";
import "source-map-support/register";

function forceFileExtensions(fileFromCommandLine: string, ext: string): string {
  let pathObj = path.parse(fileFromCommandLine);
  pathObj.base = undefined;
  pathObj.ext = ext;
  return path.format(pathObj);
}

function writeFile(filePath: string, content: string, dryRun: boolean): void {
  if (dryRun) {
    console.log(content);
  } else {
    fs.writeFileSync(filePath, content);
  }
}

async function main(): Promise<void> {
  let program = new Command();
  program
    .command("build")
    .description("Build all files.")
    .action(
      async (): Promise<void> => {
        build();
      }
    );
  program
    .command("buildweb")
    .description(
      `Build files and bundle modules mapped by urls into HTML files ` +
        `according to the config in ${URL_TO_MODULES_CONFIG_FILE}.`
    )
    .action(
      async (): Promise<void> => {
        let success = build();
        if (!success) {
          return;
        }
        await buildUrl(URL_TO_MODULES_CONFIG_FILE);
      }
    );
  program
    .command("buildchromeextension")
    .alias("buildcext")
    .description(
      `Build files and bundle modules needed by Chrome extension as specified` +
        ` in${CHROME_EXTENSION_MANIFEST_NAME}, while generating manifest.json` +
        ` pointed to the bundled files.`
    )
    .action(
      async (): Promise<void> => {
        let success = build();
        if (!success) {
          return;
        }
        await buildChromeExtension(".");
      }
    );
  program
    .command("packchromeextension")
    .alias("packcext")
    .description(
      `Build files and bundle modules, followed by packing Chrome ` +
        `extension as ${CHROME_EXTENSION_PACKAGE_NAME}.`
    )
    .action(
      async (): Promise<void> => {
        let success = build();
        if (!success) {
          return;
        }
        await packChromeExtension(".");
      }
    );
  program
    .command("clean")
    .description("Delete all files generated from building and bundling.")
    .action(
      async (): Promise<void> => {
        await clean(".");
      }
    );
  program
    .command("run <file>")
    .description(
      `Compile and run the specified file whose extension can be .js, .ts, a ` +
        `single ".", or no extension at all, but cannot be .d.ts, which will ` +
        `be changed to a js file. Pass through arguments to the executable ` +
        `file after --.`
    )
    .action(
      async (file, options, extraArgs): Promise<void> => {
        build();
        let jsFile = forceFileExtensions(file, ".js");
        let args: string[];
        if (!extraArgs) {
          args = [];
        } else {
          args = extraArgs;
        }
        spawnSync("node", [jsFile, ...args], {
          stdio: "inherit",
        });
      }
    );
  program
    .command("format <file>")
    .alias("fmt")
    .description(
      `Format the specified file whose extension can be .js, .ts, a single ` +
        `".", or no extension at all, but cannot be .d.ts, which will be ` +
        `changed to a ts file.`
    )
    .option(
      "--dry-run",
      "Print the formatted content instead of overwriting the file."
    )
    .action(
      async (file, options): Promise<void> => {
        let tsFile = forceFileExtensions(file, ".ts");
        let contentToBeFormatted = fs.readFileSync(tsFile).toString();
        let contentImportsSorted = new ImportsSorter(
          contentToBeFormatted
        ).sort();
        let contentFormatted = prettier.format(contentImportsSorted, {
          parser: "typescript",
        });
        writeFile(tsFile, contentFormatted, options.dryRun);
      }
    );
  program
    .command("message <file>")
    .alias("msg")
    .description(
      `Generate implementions of MessageUtil for and overwrite the specified ` +
        `file whose extension can be .js, .ts, a single ".", or no extension ` +
        `at all, but cannot be .d.ts, which will be changed to a ts file.`
    )
    .option(
      "--dry-run",
      "Print the generated implementations instead of overwriting the file."
    )
    .action(
      async (file, options): Promise<void> => {
        let tsFile = forceFileExtensions(file, ".ts");
        let contentToBeProcessed = fs.readFileSync(tsFile).toString();
        let contentGenerated = new MessageGenerator(
          contentToBeProcessed
        ).generate();
        let contentFormatted = prettier.format(contentGenerated, {
          parser: "typescript",
        });
        writeFile(tsFile, contentFormatted, options.dryRun);
      }
    );
  await program.parseAsync();
}

main();
