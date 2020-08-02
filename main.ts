#!/usr/bin/env node
import fs = require("fs");
import path = require("path");
import prettier = require("prettier");
import { build, bundleUrl, clean } from "./build";
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
    .command("bundleUrl")
    .alias("burl")
    .description(
      `Bundle modules into HTML files according to the config in ` +
        `${URL_TO_MODULES_CONFIG_FILE}.`
    )
    .action(
      async (): Promise<void> => {
        build();
        await bundleUrl(URL_TO_MODULES_CONFIG_FILE);
      }
    );
  program
    .command("clean")
    .description("Delete all files generated from building and bundling.")
    .action(
      async (): Promise<void> => {
        await clean();
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
