import browserify = require("browserify");
import fs = require("fs");
import path = require("path");
import stream = require("stream");
import UglifyJS = require("uglify-js");
import util = require("util");
import zlib = require("zlib");
import {
  BUILD_INFO_HOLDER_UTIL,
  BuildInfo,
  BuildInfoHolder,
} from "./build_info";
import { spawnSync } from "child_process";
import { BUNDLE_EXT, GZIP_EXT } from "selfage/common";
import { StreamReader } from "selfage/stream_reader";
import { URL_TO_BUNDLES_HOLDER_UTIL } from "selfage/url_to_bundle";

let pipeline = util.promisify(stream.pipeline);
let BUILD_INFO_FILE_EXT = ".buildinfo";

export class Builder {
  private static FILE_NOT_EXISTS_ERROR_CODE = "ENOENT";

  private streamReader = new StreamReader();

  public build(): void {
    spawnSync("npx", ["tsc"], { stdio: "inherit" });
  }

  public async bundle(urlToBundlesFile: string): Promise<void> {
    let urlToBundlesBuffer: Buffer;
    try {
      urlToBundlesBuffer = await fs.promises.readFile(urlToBundlesFile);
    } catch (e) {
      if (e.code === Builder.FILE_NOT_EXISTS_ERROR_CODE) {
        return;
      } else {
        throw e;
      }
    }

    let urlToBundlesHolder = URL_TO_BUNDLES_HOLDER_UTIL.from(
      JSON.parse(urlToBundlesBuffer.toString())
    );
    let promisesToBundle = urlToBundlesHolder.urlToBundles.map(
      async (urlToBundle): Promise<void> => {
        let buildInfoFile =
          urlToBundle.modulePath + BUILD_INFO_FILE_EXT;
        if (!(await Builder.needsBundle(buildInfoFile))) {
          return;
        }
        let sourceFile = urlToBundle.modulePath + ".js";
        let targetFile = urlToBundle.modulePath + BUNDLE_EXT;
        let compressedTargetFile = targetFile + GZIP_EXT;
        let promisesToWrite: Promise<void>[] = [];

        let browserifyHandler = browserify(sourceFile);
        let involvedFiles: string[] = [];
        browserifyHandler.on("file", (file) => {
          involvedFiles.push(file);
        });
        let code = await this.streamReader.readString(
          browserifyHandler.bundle()
        );
        let minifiedCode = UglifyJS.minify(code).code;
        promisesToWrite.push(fs.promises.writeFile(targetFile, minifiedCode));

        let writeStreamOfCompressedCode = fs.createWriteStream(
          compressedTargetFile
        );
        promisesToWrite.push(
          pipeline(
            stream.Readable.from(minifiedCode),
            zlib.createGzip(),
            writeStreamOfCompressedCode
          )
        );

        let buildInfos: BuildInfo[] = [];
        let promisesToCollectBuildInfos = involvedFiles.map(
          async (file): Promise<void> => {
            let fileStat = await fs.promises.stat(file);
            buildInfos.push({ fileName: file, mtimeMs: fileStat.mtimeMs });
          }
        );
        await Promise.all(promisesToCollectBuildInfos);
        let buildInfoHolder: BuildInfoHolder = { buildInfos: buildInfos };
        promisesToWrite.push(
          fs.promises.writeFile(buildInfoFile, JSON.stringify(buildInfoHolder))
        );
        await Promise.all(promisesToWrite);
      }
    );
    await Promise.all(promisesToBundle);
  }

  private static async needsBundle(buildInfoFile: string): Promise<boolean> {
    let buildInfoBuffer: Buffer;
    try {
      buildInfoBuffer = await fs.promises.readFile(buildInfoFile);
    } catch (e) {
      if (e.code === Builder.FILE_NOT_EXISTS_ERROR_CODE) {
        return true;
      } else {
        throw e;
      }
    }

    let buildInfoHolder = BUILD_INFO_HOLDER_UTIL.from(
      JSON.parse(buildInfoBuffer.toString())
    );
    let promisesToCheck = buildInfoHolder.buildInfos.map(
      async (buildInfo): Promise<boolean> => {
        let fileStats = await fs.promises.stat(buildInfo.fileName);
        return fileStats.mtimeMs > buildInfo.mtimeMs;
      }
    );
    return (await Promise.all(promisesToCheck)).some((updated): boolean => {
      return updated;
    });
  }
}

export class BuildCleaner {
  private static EXCLUDED_DIRS = new Set<string>(["node_modules"]);
  private static FILE_EXTS_BUILT = [
    ".d.ts",
    ".js",
    ".js.map",
    ".tsbuildinfo",
    BUILD_INFO_FILE_EXT, 
    BUNDLE_EXT,
    GZIP_EXT,
  ];

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
          files.push(...filesFromSubDirectory);
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
