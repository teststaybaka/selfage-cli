import fs = require("fs");
import path = require("path");
import { spawnSync } from "child_process";
import { extendArray } from "selfage/common";

export function buildAllFiles(): void {
  spawnSync("tsc", [], { stdio: "inherit" });
}

export class BuildCleaner {
  private static EXCLUDED_DIRS = new Set<string>(["node_modules"]);
  private static FILE_EXTS_BUILT = [".d.ts", ".js", ".js.map"];

  public static clean(): void {
    let files = BuildCleaner.findFilesRecursively(".");
    for (let file of files) {
      fs.unlinkSync(file);
    }
  }

  private static findFilesRecursively(dir: string): string[] {
    let files = [];
    let items = fs.readdirSync(dir);
    for (let item of items) {
      let fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!BuildCleaner.EXCLUDED_DIRS.has(fullPath)) {
          let filesFromSubDirectory = BuildCleaner.findFilesRecursively(
            fullPath
          );
          extendArray(files, filesFromSubDirectory);
        }
      } else {
        for (let ext of BuildCleaner.FILE_EXTS_BUILT) {
          if (fullPath.endsWith(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    return files;
  }
}
