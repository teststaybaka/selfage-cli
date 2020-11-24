import {
  NamedTypeDescriptor,
  NamedTypeKind,
  MessageFieldType,
} from "selfage/named_type_descriptor";

export interface FileMtime {
  fileName?: string;
  mtimeMs?: number;
}

export let FILE_MTIME: NamedTypeDescriptor<FileMtime> = {
  name: "FileMtime",
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: "fileName",
      type: MessageFieldType.STRING,
    },
    {
      name: "mtimeMs",
      type: MessageFieldType.NUMBER,
    },
  ],
};

export interface FileMtimeList {
  fileMtimes?: FileMtime[];
}

export let FILE_MTIME_LIST: NamedTypeDescriptor<FileMtimeList> = {
  name: "FileMtimeList",
  kind: NamedTypeKind.MESSAGE,
  factoryFn: () => {
    return new Object();
  },
  messageFields: [
    {
      name: "fileMtimes",
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: FILE_MTIME,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ],
};
