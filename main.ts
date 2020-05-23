#!/usr/bin/env node
import { parse as parsePath, format as formatPath } from "path";
import { buildAllFiles } from "./build";
import { MessageGenerator } from "./message_generator";
import { execSync } from "child_process";
import "source-map-support/register";

async function main(): Promise<void> {
  let purpose = process.argv[2];
  if (purpose === "build") {
    await buildAllFiles();
  } else if (purpose === "run") {
    await buildAllFiles();
    let pathObj = parsePath(process.argv[3]);
    pathObj.base = undefined;
    pathObj.ext = ".js";
    let passAlongArgs = process.argv.slice(4);
    let output = execSync(`node ${formatPath(pathObj)} ${passAlongArgs}`);
    console.log(output.toString());
  } else if (purpose === "msg") {
    let pathObj = parsePath(process.argv[3]);
    pathObj.base = undefined;
    pathObj.ext = ".ts";
    let dryRun = process.argv[4] === "dryRun";
    new MessageGenerator(formatPath(pathObj), dryRun).generate();
    if (!dryRun) {
      await buildAllFiles();
    }
  } else {
    console.log(`Usage:
  selfage build
  selfage run <relative file path> <pass-through flags>
  selfage msg <relative file path> <dryRun>
  
  build: Compile all files.
  run: Compile and run the specified file with the rest of the flags passed through.
  msg: Generate implementions of MessageSerializer for and overwrite the specified file, followed by compiling to verify the result.

  <relative file path>'s extension can be .js, .ts, a single ".", or no extension at all, but cannot be .d.ts. It will be transformed to ts or js file depending on the command.
  <pass-through flags> is the list of rest command line arguments which will be passed to the program being started as it is.
  <dryRun> when typed verbatim, indicates a print of resulted file instead of overwriting the file in-place.
`);
  }
}

main();
