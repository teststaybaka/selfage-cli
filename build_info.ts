import { MessageUtil } from "selfage/message_util";

export interface BuildInfo {
  fileName?: string;
  mtimeMs?: number;
}

export class BuildInfoUtil implements MessageUtil<BuildInfo> {
  public from(obj?: any, output?: object): BuildInfo {
    if (!obj || typeof obj !== "object") {
      return undefined;
    }

    let ret: BuildInfo;
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

export let BUILD_INFO_UTIL = new BuildInfoUtil();

export interface BuildInfoHolder {
  buildInfos?: BuildInfo[];
}

export class BuildInfoHolderUtil implements MessageUtil<BuildInfoHolder> {
  public from(obj?: any, output?: object): BuildInfoHolder {
    if (!obj || typeof obj !== "object") {
      return undefined;
    }

    let ret: BuildInfoHolder;
    if (output) {
      ret = output;
    } else {
      ret = {};
    }
    if (Array.isArray(obj.buildInfos)) {
      ret.buildInfos = [];
      for (let element of obj.buildInfos) {
        let parsedElement = BUILD_INFO_UTIL.from(element);
        if (parsedElement !== undefined) {
          ret.buildInfos.push(parsedElement);
        }
      }
    }
    return ret;
  }
}

export let BUILD_INFO_HOLDER_UTIL = new BuildInfoHolderUtil();
