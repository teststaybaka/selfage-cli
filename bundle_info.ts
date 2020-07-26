import {
  NamedTypeDescriptor,
  NamedTypeKind,
  MessageFieldType,
} from "selfage/named_type_descriptor";

export interface BundleInfo {
  fileName?: string;
  mtimeMs?: number;
}

export let BUNDLE_INFO_DESCRIPTOR: NamedTypeDescriptor<BundleInfo> = {
  name: "BundleInfo",
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

export interface BundleInfoHolder {
  bundleInfos?: BundleInfo[];
}

export let BUNDLE_INFO_HOLDER_DESCRIPTOR: NamedTypeDescriptor<BundleInfoHolder> = {
  name: "BundleInfoHolder",
  kind: NamedTypeKind.MESSAGE,
  messageFields: [
    {
      name: "bundleInfos",
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: BUNDLE_INFO_DESCRIPTOR,
      isArray: true,
    },
  ],
};
