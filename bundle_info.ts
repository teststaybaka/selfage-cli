import { MessageUtil } from "selfage/message_util";

export interface BundleInfo {
  fileName?: string;
  mtimeMs?: number;
}

export class BundleInfoUtil implements MessageUtil<BundleInfo> {
  public from(obj?: any, output?: object): BundleInfo {
    if (!obj || typeof obj !== "object") {
      return undefined;
    }

    let ret: BundleInfo;
    if (output) {
      ret = output;
    } else {
      ret = {};
    }
    if (typeof obj.fileName === "string") {
      ret.fileName = obj.fileName;
    }
    if (typeof obj.mtimeMs === "number") {
      ret.mtimeMs = obj.mtimeMs;
    }
    return ret;
  }
}

export let BUNDLE_INFO_UTIL = new BundleInfoUtil();

export interface BundleInfoHolder {
  bundleInfos?: BundleInfo[];
}

export class BundleInfoHolderUtil implements MessageUtil<BundleInfoHolder> {
  public from(obj?: any, output?: object): BundleInfoHolder {
    if (!obj || typeof obj !== "object") {
      return undefined;
    }

    let ret: BundleInfoHolder;
    if (output) {
      ret = output;
    } else {
      ret = {};
    }
    if (Array.isArray(obj.bundleInfos)) {
      ret.bundleInfos = [];
      for (let element of obj.bundleInfos) {
        let parsedElement = BUNDLE_INFO_UTIL.from(element);
        if (parsedElement !== undefined) {
          ret.bundleInfos.push(parsedElement);
        }
      }
    }
    return ret;
  }
}

export let BUNDLE_INFO_HOLDER_UTIL = new BundleInfoHolderUtil();
