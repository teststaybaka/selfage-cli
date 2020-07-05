import browserify = require("browserify");
import fs = require("fs");
import path = require("path");
import stream = require("stream");
import UglifyJS = require("uglify-js");
import util = require("util");
import zlib = require("zlib");
import {
  BUNDLE_INFO_HOLDER_UTIL,
  BundleInfo,
  BundleInfoHolder,
} from "./bundle_info";
import { spawnSync } from "child_process";
import {
  BUNDLE_EXT,
  FILE_NOT_EXISTS_ERROR_CODE,
  GZIP_EXT,
} from "selfage/common";
import { StreamReader } from "selfage/stream_reader";
import { URL_TO_BUNDLES_HOLDER_UTIL } from "selfage/url_to_bundle";

let pipeline = util.promisify(stream.pipeline);

export class Builder {
  private static BUNDLE_INFO_FILE_EXT = ".bundleinfo";
  private static EXCLUDED_DIRS = new Set<string>(["node_modules"]);
  private static FILE_EXTS_BUILT = [
    ".d.ts",
    ".js",
    ".js.map",
    ".tsbuildinfo",
    Builder.BUNDLE_INFO_FILE_EXT,
    BUNDLE_EXT,
    GZIP_EXT,
  ];

  private streamReader = new StreamReader();

  public build(): void {
    spawnSync("npx", ["tsc"], { stdio: "inherit" });
  }

  public async bundle(urlToBundlesFile: string): Promise<void> {
    let urlToBundlesBuffer: Buffer;
    try {
      urlToBundlesBuffer = await fs.promises.readFile(urlToBundlesFile);
    } catch (e) {
      if (e.code === FILE_NOT_EXISTS_ERROR_CODE) {
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
        let bundleInfoFile =
          urlToBundle.modulePath + Builder.BUNDLE_INFO_FILE_EXT;
        if (!(await Builder.needsBundle(bundleInfoFile))) {
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
        let htmlContent = Builder.embedIntoHtml(minifiedCode);
        promisesToWrite.push(fs.promises.writeFile(targetFile, htmlContent));

        let writeStreamOfCompressedHtmlContent = fs.createWriteStream(
          compressedTargetFile
        );
        promisesToWrite.push(
          pipeline(
            stream.Readable.from(htmlContent),
            zlib.createGzip(),
            writeStreamOfCompressedHtmlContent
          )
        );

        let bundleInfos: BundleInfo[] = [];
        let promisesToCollectBundleInfos = involvedFiles.map(
          async (file): Promise<void> => {
            let fileStats = await fs.promises.stat(file);
            bundleInfos.push({ fileName: file, mtimeMs: fileStats.mtimeMs });
          }
        );
        await Promise.all(promisesToCollectBundleInfos);
        let bundleInfoHolder: BundleInfoHolder = { bundleInfos: bundleInfos };
        promisesToWrite.push(
          fs.promises.writeFile(
            bundleInfoFile,
            JSON.stringify(bundleInfoHolder)
          )
        );
        await Promise.all(promisesToWrite);
      }
    );
    await Promise.all(promisesToBundle);
  }

  private static async needsBundle(bundleInfoFile: string): Promise<boolean> {
    let bundleInfoBuffer: Buffer;
    try {
      bundleInfoBuffer = await fs.promises.readFile(bundleInfoFile);
    } catch (e) {
      if (e.code === FILE_NOT_EXISTS_ERROR_CODE) {
        return true;
      } else {
        throw e;
      }
    }

    let bundleInfoHolder = BUNDLE_INFO_HOLDER_UTIL.from(
      JSON.parse(bundleInfoBuffer.toString())
    );
    let promisesToCheck = bundleInfoHolder.bundleInfos.map(
      async (bundleInfo): Promise<boolean> => {
        let fileStats = await fs.promises.stat(bundleInfo.fileName);
        return fileStats.mtimeMs > bundleInfo.mtimeMs;
      }
    );
    return (await Promise.all(promisesToCheck)).some((updated): boolean => {
      return updated;
    });
  }

  private static embedIntoHtml(jsCode: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
      <script type="text/javascript">${jsCode}</script></body></html>`;
  }

  public async clean(): Promise<void> {
    let files = await Builder.findFilesRecursively(".");
    let promisesToUnlink = files.map(
      async (file): Promise<void> => {
        await fs.promises.unlink(file);
      }
    );
    await Promise.all(promisesToUnlink);
  }

  private static async findFilesRecursively(dir: string): Promise<string[]> {
    let items = await fs.promises.readdir(dir);
    let files: string[] = [];
    let promisesOfFiles = items.map(
      async (item): Promise<void> => {
        let fullPath = path.join(dir, item);
        let fileStats = await fs.promises.stat(fullPath);
        if (fileStats.isDirectory()) {
          if (!Builder.EXCLUDED_DIRS.has(fullPath)) {
            let filesFromSubDirectory = await Builder.findFilesRecursively(
              fullPath
            );
            files.push(...filesFromSubDirectory);
          }
        } else {
          for (let ext of Builder.FILE_EXTS_BUILT) {
            if (fullPath.endsWith(ext)) {
              files.push(fullPath);
            }
          }
        }
      }
    );
    await Promise.all(promisesOfFiles);
    return files;
  }
}
