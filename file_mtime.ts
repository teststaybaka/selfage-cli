import {
  NamedTypeDescriptor,
  NamedTypeKind,
  MessageFieldType,
} from "selfage/named_type_descriptor";

export interface FileMtime {
  fileName?: string;
  mtimeMs?: number;
}

export let FILE_MTIME_DESCRIPTOR: NamedTypeDescriptor<FileMtime> = {
  name: "FileMtime",
  kind: NamedTypeKind.MESSAGE,
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

export let FILE_MTIME_LIST_DESCRIPTOR: NamedTypeDescriptor<FileMtimeList> = {
  name: "FileMtimeList",
  kind: NamedTypeKind.MESSAGE,
  messageFields: [
    {
      name: "fileMtimes",
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: FILE_MTIME_DESCRIPTOR,
      isArray: true,
    },
  ],
};
