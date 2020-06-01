#!/usr/bin/env node

import path = require("path");
import prettier = require("prettier");
import { BuildCleaner, buildAllFiles } from "./build";
import { ImportsSorter } from "./imports_sorter";
import { MessageGenerator } from "./message_generator";
import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import "source-map-support/register";

let PURPOSE_BUILD = "build";
let PURPOSE_CLEAN = "clean";
let PURPOSE_RUN = "run";
let PURPOSE_FORMAT = "fmt";
let PURPOSE_MESSAGE = "msg";
let DRY_RUN_FLAG = "dry_run";

function forceFileExtensions(fileFromCommandLine: string, ext: string): string {
  let pathObj = path.parse(fileFromCommandLine);
  pathObj.base = undefined;
  pathObj.ext = ext;
  return path.format(pathObj);
}

function writeFile(filePath: string, content: string, dryRunArg: string): void {
  if (dryRunArg === DRY_RUN_FLAG) {
    console.log(content);
  } else {
    writeFileSync(filePath, content);
  }
}

async function main(): Promise<void> {
  let purpose = process.argv[2];
  if (purpose === PURPOSE_BUILD) {
    buildAllFiles();
  } else if (purpose === PURPOSE_CLEAN) {
    BuildCleaner.clean();
  } else if (purpose === PURPOSE_RUN) {
    buildAllFiles();
    let filePath = forceFileExtensions(process.argv[3], ".js");
    let passAlongArgs = process.argv.slice(4);
    spawnSync("node", [filePath, ...passAlongArgs], {
      stdio: "inherit",
    });
  } else if (purpose === PURPOSE_FORMAT) {
    let filePath = forceFileExtensions(process.argv[3], ".ts");
    let contentToBeFormatted = readFileSync(filePath).toString();
    let contentImportsSorted = new ImportsSorter(contentToBeFormatted).sort();
    let contentFormatted = prettier.format(contentImportsSorted, {
      parser: "typescript",
    });
    writeFile(filePath, contentFormatted, process.argv[4]);
  } else if (purpose === PURPOSE_MESSAGE) {
    let filePath = forceFileExtensions(process.argv[3], ".ts");
    let contentGenerated = new MessageGenerator(filePath).generate();
    let contentFormatted = prettier.format(contentGenerated, {
      parser: "typescript",
    });
    writeFile(filePath, contentFormatted, process.argv[4]);
  } else {
    console.log(`Usage:
  selfage ${PURPOSE_BUILD}
  selfage ${PURPOSE_CLEAN}
  selfage ${PURPOSE_RUN} <relative file path> <pass-through flags>
  selfage ${PURPOSE_FORMAT} <relative file path> <${DRY_RUN_FLAG}>
  selfage ${PURPOSE_MESSAGE} <relative file path> <${DRY_RUN_FLAG}>
  
  ${PURPOSE_BUILD}: Compile all files.
  ${PURPOSE_CLEAN}: Delete all files generated from compiling.
  ${PURPOSE_RUN}: Compile and run the specified file with the rest of the flags passed through.
  ${PURPOSE_FORMAT}: Format the specified file with lint warnings, if any.
  ${PURPOSE_MESSAGE}: Generate implementions of MessageUtil for and overwrite the specified file..

  <relative file path>'s extension can be .js, .ts, a single ".", or no extension at all, but cannot be .d.ts. It will be transformed to ts or js file depending on the command.
  <pass-through flags> is the list of rest command line arguments which will be passed to the program being started as it is.
  <${DRY_RUN_FLAG}> when typed verbatim, indicates a print of resulted file instead of overwriting the file in-place.
`);
  }
}

main();
