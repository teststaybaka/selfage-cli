#!/usr/bin/env node
import path = require("path");
import prettier = require("prettier");
import { readFileSync, writeFileSync } from "fs";
import { buildAllFiles, BuildCleaner } from "./build";
import { MessageGenerator } from "./message_generator";
import { spawnSync } from "child_process";
import "source-map-support/register";

function forceFileExtensions(fileFromCommandLine: string, ext: string): string {
  let pathObj = path.parse(fileFromCommandLine);
  pathObj.base = undefined;
  pathObj.ext = ext;
  return path.format(pathObj);
}

async function main(): Promise<void> {
  let purpose = process.argv[2];
  if (purpose === "build") {
    buildAllFiles();
  } else if (purpose === "clean") {
    BuildCleaner.clean();
  } else if (purpose === "run") {
    buildAllFiles();
    let filePath = forceFileExtensions(process.argv[3], ".js");
    let passAlongArgs = process.argv.slice(4);
    spawnSync("node", [filePath, ...passAlongArgs], {
      stdio: "inherit",
    });
  } else if (purpose === "fmt") {
    let filePath = forceFileExtensions(process.argv[3], ".ts");
    let dryRun = process.argv[4] === "dryRUn";
    let codeToBeFormatted = readFileSync(filePath).toString();
    let codeFormatted = prettier.format(codeToBeFormatted, {
      parser: "typescript",
    });
    if (dryRun) {
      console.log(codeFormatted);
    } else {
      writeFileSync(filePath, codeFormatted);
    }
  } else if (purpose === "msg") {
    let filePath = forceFileExtensions(process.argv[3], ".ts");
    let dryRun = process.argv[4] === "dryRun";
    new MessageGenerator(filePath, dryRun).generate();
  } else {
    console.log(`Usage:
  selfage build
  selfage clean
  selfage run <relative file path> <pass-through flags>
  selfage fmt <relative file path> <dryRun>
  selfage msg <relative file path> <dryRun>
  
  build: Compile all files.
  clean: Delete all files generated from compiling.
  run: Compile and run the specified file with the rest of the flags passed through.
  fmt: Format the specified file with lint warnings, if any.
  msg: Generate implementions of MessageUtil for and overwrite the specified file..

  <relative file path>'s extension can be .js, .ts, a single ".", or no extension at all, but cannot be .d.ts. It will be transformed to ts or js file depending on the command.
  <pass-through flags> is the list of rest command line arguments which will be passed to the program being started as it is.
  <dryRun> when typed verbatim, indicates a print of resulted file instead of overwriting the file in-place.
`);
  }
}

main();
