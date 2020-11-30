#!/usr/bin/env node
import fs = require("fs");
import path = require("path");
import prettier = require("prettier");
import {
  CHROME_EXTENSION_MANIFEST_NAME,
  CHROME_EXTENSION_PACKAGE_NAME,
  build,
  buildChromeExtension,
  buildWebPage,
  clean,
  packChromeExtension,
  writeServerEnvironmentFlag,
} from "./build";
import { sortImports } from "./imports_sorting";
import { generateMessage } from "./message_generation";
import { spawnSync } from "child_process";
import { Command } from "commander";
import { URL_TO_MODULES_CONFIG_FILE } from "selfage/constants";
import "source-map-support/register";

function stripFileExtension(fileFromCommandLine: string): string {
  let pathObj = path.parse(fileFromCommandLine);
  pathObj.base = undefined;
  pathObj.ext = undefined;
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
    .command("set-server-environment <rootDirectory> <environment>")
    .description(
      `Set the runtime environment for the backend server(s) with a string ` +
        `representation of Environment enum in "selfage/environment.ts". ` +
        `The server's main file should depend on ` +
        `"selfage/be/environment_flag" to pick the proper services for each ` +
        `environment. The server's main file should live under the specified ` +
        `root directory.`
    )
    .action(async (rootDirectory, environment) => {
      writeServerEnvironmentFlag(rootDirectory, environment);
    });
  program
    .command("build-web-page <rootDirectory>")
    .alias("buildwp")
    .description(
      `Build files and bundle web pages based on the url to entry file ` +
        `mapping defined in <rootDirectory>/${URL_TO_MODULES_CONFIG_FILE}.`
    )
    .option(
      "-env, --environment <environment>",
      `Specify the runtime environment for the web page with a string ` +
        `representation of Environment enum in "selfage/environment.ts". The ` +
        `entry file for a web page should depend on ` +
        `"selfage/fe/environment_flag" to pick the proper backend services ` +
        `for each environment.`
    )
    .action(async (options) => {
      let success = build();
      if (success) {
        await buildWebPage(".", options.environment);
      }
    });
  program
    .command("build-chrome-extension <rootDirectory>")
    .alias("buildce")
    .description(
      `Build files and bundle scripts based on manifested defined in ` +
        `<rootDirectory>/${CHROME_EXTENSION_MANIFEST_NAME}. One could load ` +
        `<rootDirectory> as unpacked extension after building.`
    )
    .option(
      "-env, --environment <environment>",
      `Specify the runtime environment for the chrome extension with a ` +
        `string representation of Environment enum in ` +
        `"selfage/environment.ts". The entry file for each script should ` +
        `depend on "selfage/fe/environment_flag" to pick the proper backend ` +
        `services for each environment.`
    )
    .action(async (rootDirectory, options) => {
      let success = build();
      if (success) {
        await buildChromeExtension(rootDirectory, options.environment);
      }
    });
  program
    .command("pack-chrome-extension <rootDirectory>")
    .alias("packce")
    .description(
      `Build files and bundle scripts based on manifested defined in ` +
        `<rootDirectory>/${CHROME_EXTENSION_MANIFEST_NAME}, followed by ` +
        `packing <rootDirectory> into ${CHROME_EXTENSION_PACKAGE_NAME} which ` +
        `is ready to be uploaded to Chrome web store.`
    )
    .option(
      "-env, --environment <environment>",
      `Specify the runtime environment for the chrome extension with a ` +
        `string representation of Environment enum in ` +
        `"selfage/environment.ts". The entry file for each script should ` +
        `depend on "selfage/fe/environment_flag" to pick the proper backend ` +
        `services for each environment.`
    )
    .action(async (rootDirectory, options) => {
      let success = build();
      if (success) {
        await packChromeExtension(rootDirectory, options.environment);
      }
    });
  program
    .command("clean")
    .description("Delete all files generated from building and bundling.")
    .action(async () => {
      await clean(".");
    });
  program
    .command("run <file>")
    .description(
      `Compile and run the specified file whose extension can be .js, .ts, a ` +
        `single ".", or no extension at all, but cannot be .d.ts, which will ` +
        `be changed to a js file. Pass through arguments to the executable ` +
        `file after --.`
    )
    .action(async (file, options, extraArgs) => {
      build();
      let jsFile = stripFileExtension(file) + ".js";
      let args: string[];
      if (!extraArgs) {
        args = [];
      } else {
        args = extraArgs;
      }
      spawnSync("node", [jsFile, ...args], {
        stdio: "inherit",
      });
    });
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
    .action(async (file, options) => {
      let tsFile = stripFileExtension(file) + ".ts";
      let contentToBeFormatted = fs.readFileSync(tsFile).toString();
      let contentImportsSorted = sortImports(contentToBeFormatted);
      let contentFormatted = prettier.format(contentImportsSorted, {
        parser: "typescript",
      });
      writeFile(tsFile, contentFormatted, options.dryRun);
    });
  program
    .command("message <file>")
    .alias("msg")
    .description(
      `Generate implementions of MessageUtil for and overwrite the specified ` +
        `file whose extension can be .js, .ts, a single ".", or no extension ` +
        `at all, but cannot be .d.ts, which will be changed to a ts file.`
    )
    .option(
      "-p, --package-directory [dir]",
      "Specify the directory that contains the NamedTypeDescriptor interface."
    )
    .option(
      "--dry-run",
      "Print the generated implementations instead of overwriting the file."
    )
    .action(async (file, options) => {
      let modulePath = stripFileExtension(file);
      let packageDirectory = options.packageDirectory
        ? options.packageDirectory
        : "selfage";
      let { filename: outputFile, content } = generateMessage(
        modulePath,
        packageDirectory
      );
      let contentFormatted = prettier.format(content, {
        parser: "typescript",
      });
      writeFile(outputFile, contentFormatted, options.dryRun);
    });
  await program.parseAsync();
}

main();
