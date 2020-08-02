import browserify = require("browserify");
import fs = require("fs");
import path = require("path");
import stream = require("stream");
import UglifyJS = require("uglify-js");
import util = require("util");
import zlib = require("zlib");
import {
  FILE_MTIME_LIST_DESCRIPTOR,
  FileMtime,
  FileMtimeList,
} from "./file_mtime";
import { spawnSync } from "child_process";
import { FILE_NOT_EXISTS_ERROR_CODE, GZIP_EXT } from "selfage/common";
import { parseJsonString } from "selfage/named_type_util";
import { STREAM_READER } from "selfage/stream_reader";
import { URL_TO_MODULE_MAPPING_DESCRIPTOR } from "selfage/url_to_module";

let pipeline = util.promisify(stream.pipeline);
let FILE_MTIME_CACHE_EXT = ".filemtime";
let EXCLUDED_DIRS = new Set<string>(["node_modules"]);
let FILE_EXTS_BUILT = [
  ".d.ts",
  ".js",
  ".js.map",
  ".tsbuildinfo",
  ".html",
  FILE_MTIME_CACHE_EXT,
  GZIP_EXT,
];

export function build(): void {
  spawnSync("npx", ["tsc"], { stdio: "inherit" });
}

export async function bundleUrl(urlToModulesFile: string): Promise<void> {
  let urlToModulesBuffer: Buffer;
  try {
    urlToModulesBuffer = await fs.promises.readFile(urlToModulesFile);
  } catch (e) {
    if (e.code === FILE_NOT_EXISTS_ERROR_CODE) {
      return;
    } else {
      throw e;
    }
  }

  let urlToModuleMapping = parseJsonString(
    urlToModulesBuffer.toString(),
    URL_TO_MODULE_MAPPING_DESCRIPTOR
  );
  let promisesToBundle = urlToModuleMapping.urlToModules.map(
    async (urlToModule): Promise<void> => {
      let fileMtimeCacheFile = urlToModule.modulePath + FILE_MTIME_CACHE_EXT;
      if (!(await needsBundle(fileMtimeCacheFile))) {
        return;
      }
      let sourceFile = urlToModule.modulePath + ".js";
      let targetFile = urlToModule.modulePath + ".html";
      let compressedTargetFile = targetFile + GZIP_EXT;
      let promisesToWrite: Promise<void>[] = [];

      let browserifyHandler = browserify(sourceFile, { debug: true });
      let involvedFiles: string[] = [];
      browserifyHandler.on("file", (file) => {
        involvedFiles.push(file);
      });
      let code = await STREAM_READER.readString(browserifyHandler.bundle());
      let minifiedCode = UglifyJS.minify(code, {
        sourceMap: { content: "inline", includeSources: true, url: "inline" },
      }).code;
      let htmlContent = embedIntoHtml(minifiedCode);
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

      let fileMtimes: FileMtime[] = [];
      let promisesToCollectFileMtimes = involvedFiles.map(
        async (file): Promise<void> => {
          let fileStats = await fs.promises.stat(file);
          fileMtimes.push({ fileName: file, mtimeMs: fileStats.mtimeMs });
        }
      );
      await Promise.all(promisesToCollectFileMtimes);
      let fileMtimeList: FileMtimeList = { fileMtimes: fileMtimes };
      promisesToWrite.push(
        fs.promises.writeFile(fileMtimeCacheFile, JSON.stringify(fileMtimeList))
      );
      await Promise.all(promisesToWrite);
    }
  );
  await Promise.all(promisesToBundle);
}

async function needsBundle(fileMtimeCacheFile: string): Promise<boolean> {
  let fileMtimesBuffer: Buffer;
  try {
    fileMtimesBuffer = await fs.promises.readFile(fileMtimeCacheFile);
  } catch (e) {
    if (e.code === FILE_NOT_EXISTS_ERROR_CODE) {
      return true;
    } else {
      throw e;
    }
  }

  let fileMtimeList = parseJsonString(
    fileMtimesBuffer.toString(),
    FILE_MTIME_LIST_DESCRIPTOR
  );
  let promisesToCheck = fileMtimeList.fileMtimes.map(
    async (fileMtime): Promise<boolean> => {
      let fileStats: fs.Stats;
      try {
        fileStats = await fs.promises.stat(fileMtime.fileName);
      } catch (e) {
        return true;
      }
      return fileStats.mtimeMs > fileMtime.mtimeMs;
    }
  );
  return (await Promise.all(promisesToCheck)).some((updated): boolean => {
    return updated;
  });
}

function embedIntoHtml(jsCode: string): string {
  return (
    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>` +
    `<script type="text/javascript">${jsCode}</script></body></html>`
  );
}

export async function clean(): Promise<void> {
  let files = await findFilesRecursively(".");
  let promisesToUnlink = files.map(
    async (file): Promise<void> => {
      await fs.promises.unlink(file);
    }
  );
  await Promise.all(promisesToUnlink);
}

async function findFilesRecursively(dir: string): Promise<string[]> {
  let items = await fs.promises.readdir(dir);
  let files: string[] = [];
  let promisesOfFiles = items.map(
    async (item): Promise<void> => {
      let fullPath = path.join(dir, item);
      let fileStats = await fs.promises.stat(fullPath);
      if (fileStats.isDirectory()) {
        if (!EXCLUDED_DIRS.has(fullPath)) {
          let filesFromSubDirectory = await findFilesRecursively(fullPath);
          files.push(...filesFromSubDirectory);
        }
      } else {
        for (let ext of FILE_EXTS_BUILT) {
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
