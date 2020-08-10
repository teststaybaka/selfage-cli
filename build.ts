import archiver = require("archiver");
import browserify = require("browserify");
import fs = require("fs");
import path = require("path");
import stream = require("stream");
import UglifyJS = require("uglify-js");
import util = require("util");
import zlib = require("zlib");
import ignore from "ignore";
import { FILE_MTIME_LIST, FileMtime, FileMtimeList } from "./file_mtime";
import { spawnSync } from "child_process";
import {
  FILE_NOT_EXISTS_ERROR_CODE,
  GZIP_EXT,
  URL_TO_MODULES_CONFIG_FILE,
} from "selfage/common";
import { parseJsonString } from "selfage/named_type_util";
import { STREAM_READER } from "selfage/stream_reader";
import { URL_TO_MODULE_MAPPING_DESCRIPTOR } from "selfage/url_to_module";

export let CHROME_EXTENSION_MANIFEST_NAME = "chrome_extension_manifest.json";
export let CHROME_EXTENSION_PACKAGE_NAME = "chrome_extension.zip";

let pipeline = util.promisify(stream.pipeline);
let CHROME_EXTENSION_BUILT_MANIFEST_NAME = "manifest.json";
let FILE_MTIME_CACHE_EXT = ".filemtime";
let NODE_MODULES_DIR = "node_modules";
let FILE_PATTERNS_BUILT = [
  "*.js",
  "*.html",
  "*.zip",
  "*.tsbuildinfo",
  `*${FILE_MTIME_CACHE_EXT}`,
  `*${GZIP_EXT}`,
  CHROME_EXTENSION_BUILT_MANIFEST_NAME,
];
let FILE_PATTERNS_IGNORED_FROM_CHROME_EXTENSION = [
  "*.ts",
  "*.js",
  "*.html",
  "*.zip",
  "*.tsbuildinfo",
  `*${FILE_MTIME_CACHE_EXT}`,
];

export function build(): boolean {
  let res = spawnSync("npx", ["tsc"], { stdio: "inherit" });
  return res.status === 0;
}

export async function buildWeb(rootDir: string): Promise<void> {
  let urlToModulesBuffer = await fs.promises.readFile(
    path.join(rootDir, URL_TO_MODULES_CONFIG_FILE)
  );
  let urlToModuleMapping = parseJsonString(
    urlToModulesBuffer.toString(),
    URL_TO_MODULE_MAPPING_DESCRIPTOR
  );
  let promisesToBundle = urlToModuleMapping.urlToModules.map(
    async (urlToModule): Promise<void> => {
      let moduleFullPath = path.join(rootDir, urlToModule.modulePath);
      let {
        isBundlingNeeded,
        code,
        promiseToWriteFileMtimes,
      } = await bundleSourceModule(moduleFullPath);
      if (!isBundlingNeeded) {
        return;
      }

      let htmlContent = embedIntoHtml(code);
      let htmlFile = moduleFullPath + ".html";
      let promiseToWriteHtmlFile = fs.promises.writeFile(htmlFile, htmlContent);

      let compressedHtmlFile = htmlFile + GZIP_EXT;
      let promiseToWriteCompressedHtmlFile = pipeline(
        stream.Readable.from(htmlContent),
        zlib.createGzip(),
        fs.createWriteStream(compressedHtmlFile)
      );
      await Promise.all([
        promiseToWriteFileMtimes,
        promiseToWriteHtmlFile,
        promiseToWriteCompressedHtmlFile,
      ]);
    }
  );
  await Promise.all(promisesToBundle);
}

async function bundleSourceModule(
  sourceModule: string
): Promise<{
  isBundlingNeeded: boolean;
  code?: string;
  promiseToWriteFileMtimes?: Promise<void>;
}> {
  let fileMtimesCacheFile = sourceModule + FILE_MTIME_CACHE_EXT;
  if (!(await needsBundle(fileMtimesCacheFile))) {
    return { isBundlingNeeded: false };
  }
  let sourceFile = sourceModule + ".js";
  let browserifyHandler = browserify(sourceFile, { debug: true });
  let involvedFiles: string[] = [];
  browserifyHandler.on("file", (file) => {
    involvedFiles.push(file);
  });
  let code = await STREAM_READER.readString(browserifyHandler.bundle());
  let minifiedCode = UglifyJS.minify(code, {
    sourceMap: { content: "inline", includeSources: true, url: "inline" },
  }).code;
  let promiseToWriteFileMtimes = writeFileMtimes(
    fileMtimesCacheFile,
    involvedFiles
  );
  return {
    isBundlingNeeded: true,
    code: minifiedCode,
    promiseToWriteFileMtimes: promiseToWriteFileMtimes,
  };
}

async function needsBundle(fileMtimesCacheFile: string): Promise<boolean> {
  let fileMtimesBuffer: Buffer;
  try {
    fileMtimesBuffer = await fs.promises.readFile(fileMtimesCacheFile);
  } catch (e) {
    if (e.code === FILE_NOT_EXISTS_ERROR_CODE) {
      return true;
    } else {
      throw e;
    }
  }

  let fileMtimeList = parseJsonString(
    fileMtimesBuffer.toString(),
    FILE_MTIME_LIST
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

async function writeFileMtimes(
  fileMtimesCacheFile: string,
  involvedFiles: string[]
): Promise<void> {
  let fileMtimes: FileMtime[] = [];
  let promisesToCollectFileMtimes = involvedFiles.map(
    async (file): Promise<void> => {
      let fileStats = await fs.promises.stat(file);
      fileMtimes.push({ fileName: file, mtimeMs: fileStats.mtimeMs });
    }
  );
  await Promise.all(promisesToCollectFileMtimes);
  let fileMtimeList: FileMtimeList = { fileMtimes: fileMtimes };
  await fs.promises.writeFile(
    fileMtimesCacheFile,
    JSON.stringify(fileMtimeList)
  );
}

function embedIntoHtml(jsCode: string): string {
  return (
    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>` +
    `<script type="text/javascript">${jsCode}</script></body></html>`
  );
}

export async function buildChromeExtension(
  rootDir: string
): Promise<{ bundledFiles: string[]; ignoredFiles: string[] }> {
  let manifestBuffer = await fs.promises.readFile(
    path.join(rootDir, CHROME_EXTENSION_MANIFEST_NAME)
  );
  let manifest = JSON.parse(manifestBuffer.toString());

  let bundledFiles: string[] = [];
  let promisesToBundle: Promise<void>[] = [];
  if (manifest.background && manifest.background.scripts) {
    for (let i = 0; i < manifest.background.scripts.length; i++) {
      let backgroundModule = path.join(rootDir, manifest.background.scripts[i]);
      manifest.background.scripts[i] += ".bundle.js";
      let backgroundBundledScript = path.join(
        rootDir,
        manifest.background.scripts[i]
      );
      bundledFiles.push(backgroundBundledScript);
      promisesToBundle.push(
        (async (): Promise<void> => {
          let {
            isBundlingNeeded,
            code,
            promiseToWriteFileMtimes,
          } = await bundleSourceModule(backgroundModule);
          if (!isBundlingNeeded) {
            return;
          }

          let promiseToWriteScriptFile = fs.promises.writeFile(
            backgroundBundledScript,
            code
          );
          await Promise.all([
            promiseToWriteFileMtimes,
            promiseToWriteScriptFile,
          ]);
        })()
      );
    }
  }
  if (manifest.content_scripts) {
    for (let i = 0; i < manifest.content_scripts.length; i++) {
      for (let j = 0; j < manifest.content_scripts[i].js.length; j++) {
        let contentScriptModule = path.join(
          rootDir,
          manifest.content_scripts[i].js[j]
        );
        manifest.content_scripts[i].js[j] += ".bundle.js";
        let contentScriptBundledScript = path.join(
          rootDir,
          manifest.content_scripts[i].js[j]
        );
        bundledFiles.push(contentScriptBundledScript);
        promisesToBundle.push(
          (async (): Promise<void> => {
            let {
              isBundlingNeeded,
              code,
              promiseToWriteFileMtimes,
            } = await bundleSourceModule(contentScriptModule);
            if (!isBundlingNeeded) {
              return;
            }

            let promiseToWriteScriptFile = fs.promises.writeFile(
              contentScriptBundledScript,
              code
            );
            await Promise.all([
              promiseToWriteFileMtimes,
              promiseToWriteScriptFile,
            ]);
          })()
        );
      }
    }
  }
  if (manifest.browser_action && manifest.browser_action.default_popup) {
    let browserActionModule = path.join(
      rootDir,
      manifest.browser_action.default_popup
    );
    manifest.browser_action.default_popup += ".bundle.html";
    let browserActionBundledHtml = path.join(
      rootDir,
      manifest.browser_action.default_popup
    );
    bundledFiles.push(browserActionBundledHtml);
    promisesToBundle.push(
      (async (): Promise<void> => {
        let {
          isBundlingNeeded,
          code,
          promiseToWriteFileMtimes,
        } = await bundleSourceModule(browserActionModule);
        if (!isBundlingNeeded) {
          return;
        }

        let html = embedIntoHtml(code);
        let promiseToWriteHtmlFile = fs.promises.writeFile(
          browserActionBundledHtml,
          html
        );
        await Promise.all([promiseToWriteFileMtimes, promiseToWriteHtmlFile]);
      })()
    );
  }

  let ignoredFiles: string[] = [];
  if (Array.isArray(manifest.ignored)) {
    ignoredFiles = manifest.ignored;
  }
  manifest.ignored = undefined;
  let promiseToWriteManifest = fs.promises.writeFile(
    path.join(rootDir, CHROME_EXTENSION_BUILT_MANIFEST_NAME),
    JSON.stringify(manifest)
  );
  await Promise.all([...promisesToBundle, promiseToWriteManifest]);
  return { bundledFiles: bundledFiles, ignoredFiles: ignoredFiles };
}

export async function packChromeExtension(rootDir: string): Promise<void> {
  let { bundledFiles, ignoredFiles } = await buildChromeExtension(rootDir);
  ignoredFiles.push(...FILE_PATTERNS_IGNORED_FROM_CHROME_EXTENSION);
  let files = await findFilesRecursively(rootDir);
  let filesToPack = ignore().add(ignoredFiles).filter(files);
  filesToPack.push(...bundledFiles);

  let archive = archiver("zip", { zlib: { level: 9 } });
  let promiseToPack = pipeline(
    archive,
    fs.createWriteStream(path.join(rootDir, CHROME_EXTENSION_PACKAGE_NAME))
  );
  for (let file of filesToPack) {
    archive.file(file, { name: file });
  }
  archive.finalize();
  await promiseToPack;
}

export async function clean(rootDir: string): Promise<void> {
  let files = await findFilesRecursively(rootDir);
  let ignoring = ignore().add(FILE_PATTERNS_BUILT);
  let promisesToUnlink = files.map(
    async (file): Promise<void> => {
      if (ignoring.ignores(file)) {
        await fs.promises.unlink(file);
      }
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
        if (item === NODE_MODULES_DIR) {
          return;
        } else {
          let filesFromSubDirectory = await findFilesRecursively(fullPath);
          files.push(...filesFromSubDirectory);
        }
      } else {
        files.push(fullPath);
      }
    }
  );
  await Promise.all(promisesOfFiles);
  return files;
}
