import { MessageDescriptor, PrimitiveType } from "selfage/message_descriptor";

export interface FileMtime {
  fileName?: string;
  mtimeMs?: number;
}

export let FILE_MTIME: MessageDescriptor<FileMtime> = {
  name: "FileMtime",
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: "fileName",
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: "mtimeMs",
      primitiveType: PrimitiveType.NUMBER,
    },
  ],
};

export interface FileMtimeList {
  fileMtimes?: Array<FileMtime>;
}

export let FILE_MTIME_LIST: MessageDescriptor<FileMtimeList> = {
  name: "FileMtimeList",
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: "fileMtimes",
      messageDescriptor: FILE_MTIME,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ],
};
