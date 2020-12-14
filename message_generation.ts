import fs = require("fs");
import path = require("path");
import { newInternalError } from "selfage/errors";

let UPPER_CASES_REGEXP = /[A-Z]/;
let PRIMITIVE_TYPE_STRING = "string";
let PRIMITIVE_TYPE_NUMBER = "number";
let PRIMITIVE_TYPE_BOOLEAN = "boolean";

interface EnumValue {
  name: string;
  value: number;
  comment?: string;
}

interface EnumDefinition {
  name: string;
  values: Array<EnumValue>;
  comment?: string;
}

interface MessageFieldDefinition {
  name: string;
  type: string;
  isArray?: true;
  import?: string;
  comment?: string;
}

interface MessageExtendDefinition {
  name: string;
  import?: string;
}

interface MessageDefinition {
  name: string;
  fields: Array<MessageFieldDefinition>;
  isObservable?: true;
  extends?: Array<MessageExtendDefinition>;
  comment?: string;
}

interface Definition {
  enum?: EnumDefinition;
  message?: MessageDefinition;
}

export function generateMessage(
  modulePath: string,
  selfageDir: string
): string {
  let definitions = JSON.parse(
    fs.readFileSync(modulePath + ".json").toString()
  ) as Array<Definition>;

  let pathObj = path.parse(modulePath);
  let typeChecker = new TypeChecker(pathObj.dir, pathObj.base);

  let importer = new Importer(selfageDir);
  let contentList = new Array<string>();
  for (let definition of definitions) {
    if (definition.enum) {
      generateEnumDescriptor(definition.enum, contentList, importer);
    } else if (definition.message) {
      if (!definition.message.isObservable) {
        generateMessageDescriptor(
          definition.message,
          typeChecker,
          contentList,
          importer
        );
      } else {
        generateObservableDescriptor(
          definition.message,
          typeChecker,
          contentList,
          importer
        );
      }
    } else {
      throw newInternalError("Unsupported new definition.");
    }
  }
  contentList = [...importer.toStringList(), ...contentList];
  return contentList.join("");
}

class TypeChecker {
  private cachedPathToMessages = new Map<string, Set<string>>();

  public constructor(private rootDir: string, private rootFile: string) {}

  public isNestedMessage(typeName: string, importPath?: string): boolean {
    let modulePath: string;
    if (importPath) {
      modulePath = path.join(this.rootDir, importPath);
    } else {
      modulePath = path.join(this.rootDir, this.rootFile);
    }
    let messages = this.cachedPathToMessages.get(modulePath);
    if (!messages) {
      messages = new Set<string>();
      this.cachedPathToMessages.set(modulePath, messages);
      let definitions = JSON.parse(
        fs.readFileSync(modulePath + ".json").toString()
      ) as Array<Definition>;
      for (let definition of definitions) {
        if (definition.message) {
          messages.add(definition.message.name);
        }
      }
    }
    return messages.has(typeName);
  }
}

class Importer {
  private pathToNamedImports = new Map<string, Set<string>>();
  private namedImportToPaths = new Map<string, string>();

  public constructor(private selfageDir: string) {}

  public importsFromMessageDescriptor(...namedImports: Array<string>): void {
    this.importIfPathExists(
      this.selfageDir + "/message_descriptor",
      ...namedImports
    );
  }

  public importFromObservable(...namedImports: Array<string>) {
    this.importIfPathExists(this.selfageDir + "/observable", ...namedImports);
  }

  public importFromObservableArray(...namedImports: Array<string>): void {
    this.importIfPathExists(
      this.selfageDir + "/observable_array",
      ...namedImports
    );
  }

  public importIfPathExists(
    path: string | undefined,
    ...namedImports: Array<string>
  ): void {
    if (!path) {
      return;
    }
    let namedImportsInMap = this.pathToNamedImports.get(path);
    if (!namedImportsInMap) {
      namedImportsInMap = new Set<string>();
      this.pathToNamedImports.set(path, namedImportsInMap);
    }
    for (let namedImport of namedImports) {
      namedImportsInMap.add(namedImport);
      this.namedImportToPaths.set(namedImport, path);
    }
  }

  public toStringList(): Array<string> {
    let content = new Array<string>();
    for (let entry of this.pathToNamedImports.entries()) {
      let importPath = entry[0];
      let namedImports = Array.from(entry[1]).join(", ");
      content.push(`import { ${namedImports} } from '${importPath}';\n`);
    }
    return content;
  }
}

function flattenFieldType(
  typeChecker: TypeChecker,
  typeName: string,
  importPath?: string
): {
  primitiveTypeName?: string;
  enumTypeName?: string;
  messageTypeName?: string;
} {
  if (
    typeName === PRIMITIVE_TYPE_STRING ||
    typeName === PRIMITIVE_TYPE_NUMBER ||
    typeName === PRIMITIVE_TYPE_BOOLEAN
  ) {
    return {
      primitiveTypeName: typeName,
    };
  }
  if (typeChecker.isNestedMessage(typeName, importPath)) {
    return {
      messageTypeName: typeName,
    };
  } else {
    return {
      enumTypeName: typeName,
    };
  }
}

function generateComment(comment: string): string {
  if (comment) {
    return `\n/* ${comment} */`;
  } else {
    return "";
  }
}

function generateEnumDescriptor(
  enumDefinition: EnumDefinition,
  contentList: Array<string>,
  importer: Importer
): void {
  let enumName = enumDefinition.name;
  contentList.push(`${generateComment(enumDefinition.comment)}
export enum ${enumName} {`);
  for (let value of enumDefinition.values) {
    contentList.push(`${generateComment(value.comment)}
  ${value.name} = ${value.value},`);
  }
  contentList.push(`
}
`);

  importer.importsFromMessageDescriptor("EnumDescriptor");
  let descriptorName = toUpperSnaked(enumName);
  contentList.push(`
export let ${descriptorName}: EnumDescriptor<${enumName}> = {
  name: '${enumName}',
  enumValues: [`);
  for (let value of enumDefinition.values) {
    contentList.push(`
    {
      name: '${value.name}',
      value: ${value.value},
    },`);
  }
  contentList.push(`
  ]
}
`);
}

function generateMessageDescriptor(
  messageDefinition: MessageDefinition,
  typeChecker: TypeChecker,
  contentList: Array<string>,
  importer: Importer
): void {
  let messageName = messageDefinition.name;
  contentList.push(`${generateComment(messageDefinition.comment)}
export interface ${messageName}`);
  if (messageDefinition.extends) {
    contentList.push(" extends ");
    contentList.push(
      messageDefinition.extends
        .map((ext) => {
          return ext.name;
        })
        .join(", ")
    );
  }
  contentList.push(" {");
  for (let field of messageDefinition.fields) {
    let fieldTypeName: string;
    if (field.isArray) {
      fieldTypeName = `Array<${field.type}>`;
    } else {
      fieldTypeName = field.type;
    }
    contentList.push(`${generateComment(field.comment)}
  ${field.name}?: ${fieldTypeName},`);
  }
  contentList.push(`
}
`);

  importer.importsFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toUpperSnaked(messageName);
  contentList.push(`
export let ${descriptorName}: MessageDescriptor<${messageName}> = {
  name: '${messageName}',
  factoryFn: () => {
    return new Object();
  },
  messageFields: [`);
  if (messageDefinition.extends) {
    for (let ext of messageDefinition.extends) {
      let extDescriptorName = toUpperSnaked(ext.name);
      importer.importIfPathExists(ext.import, ext.name, extDescriptorName);
      contentList.push(`
    ...${extDescriptorName}.messageFields,`);
    }
  }
  for (let field of messageDefinition.fields) {
    contentList.push(`
    {
      name: '${field.name}',`);
    let { primitiveTypeName, enumTypeName, messageTypeName } = flattenFieldType(
      typeChecker,
      field.type,
      field.import
    );
    if (primitiveTypeName) {
      importer.importsFromMessageDescriptor("PrimitiveType");
      contentList.push(`
      primitiveType: PrimitiveType.${primitiveTypeName.toUpperCase()},`);
    } else if (enumTypeName) {
      let enumDescriptorName = toUpperSnaked(enumTypeName);
      importer.importIfPathExists(
        field.import,
        enumTypeName,
        enumDescriptorName
      );
      contentList.push(`
      enumDescriptor: ${enumDescriptorName},`);
    } else if (messageTypeName) {
      let messageDescriptorName = toUpperSnaked(messageTypeName);
      importer.importIfPathExists(
        field.import,
        messageTypeName,
        messageDescriptorName
      );
      contentList.push(`
      messageDescriptor: ${messageDescriptorName},`);
    }
    if (field.isArray) {
      contentList.push(`
      arrayFactoryFn: () => {
        return new Array<any>();
      },`);
    }
    contentList.push(`
    },`);
  }
  contentList.push(`
  ]
};
`);
}

function generateObservableDescriptor(
  messageDefinition: MessageDefinition,
  typeChecker: TypeChecker,
  contentList: Array<string>,
  importer: Importer
): void {
  let messageName = messageDefinition.name;
  contentList.push(`${generateComment(messageDefinition.comment)}
export class ${messageName}`);
  if (messageDefinition.extends) {
    contentList.push(" extends");
    for (let ext of messageDefinition.extends) {
      contentList.push(` ${ext.name}`);
    }
  }
  importer.importFromObservable("Observable");
  contentList.push(` implements Observable {
  public onChange: () => void;`);
  for (let field of messageDefinition.fields) {
    let { messageTypeName } = flattenFieldType(
      typeChecker,
      field.type,
      field.import
    );
    let fieldTypeName: string;
    if (field.isArray) {
      if (messageTypeName) {
        importer.importFromObservableArray("ObservableNestedArray");
        fieldTypeName = `ObservableNestedArray<${field.type}>`;
      } else {
        importer.importFromObservableArray("ObservableArray");
        fieldTypeName = `ObservableArray<${field.type}>`;
      }
    } else {
      fieldTypeName = field.type;
    }
    contentList.push(`
  ${generateComment(field.comment)}
  public on${toCapitalized(
    field.name
  )}Change: (newValue: ${fieldTypeName}, oldValue: ${fieldTypeName}) => void;
  private ${field.name}_?: ${fieldTypeName};
  get ${field.name}(): ${fieldTypeName} {
    return this.${field.name}_;
  }
  set ${field.name}(value: ${fieldTypeName}) {
    let oldValue = this.${field.name}_;
    this.${field.name}_ = value;`);
    if (field.isArray || messageTypeName) {
      contentList.push(`
    if (oldValue !== undefined) {
      oldValue.onChange = undefined;
    }
    this.${field.name}_.onChange = () => {
      if (this.onChange) {
        this.onChange();
      }
    };`);
    }
    contentList.push(`
    if (this.on${toCapitalized(field.name)}Change) {
      this.on${toCapitalized(field.name)}Change(this.${field.name}_, oldValue);
    }
    if (this.onChange) {
      this.onChange();
    }
  }`);
  }
  contentList.push(`

  public emitInitialEvents(): void {`);
  for (let field of messageDefinition.fields) {
    contentList.push(`
    if (this.on${toCapitalized(field.name)}Change) {
      this.on${toCapitalized(field.name)}Change(this.${field.name}_, undefined);
    }`);
  }
  contentList.push(`
  }

  public toJSON(): Object {
    return {`);
  for (let field of messageDefinition.fields) {
    contentList.push(`
      ${field.name}: this.${field.name},`);
  }
  contentList.push(`
    };
  }
}
`);

  importer.importsFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toUpperSnaked(messageName);
  contentList.push(`
export let ${descriptorName}: MessageDescriptor<${messageName}> = {
  name: '${messageName}',
  factoryFn: () => {
    return new ${messageName}();
  },
  messageFields: [`);
  if (messageDefinition.extends) {
    for (let ext of messageDefinition.extends) {
      let extDescriptorName = toUpperSnaked(ext.name);
      importer.importIfPathExists(ext.import, ext.name, extDescriptorName);
      contentList.push(`
    ...${extDescriptorName}.messageFields,`);
    }
  }
  for (let field of messageDefinition.fields) {
    contentList.push(`
    {
      name: '${field.name}',`);
    let { primitiveTypeName, enumTypeName, messageTypeName } = flattenFieldType(
      typeChecker,
      field.type,
      field.import
    );
    if (primitiveTypeName) {
      importer.importsFromMessageDescriptor("PrimitiveType");
      contentList.push(`
      primitiveType: PrimitiveType.${primitiveTypeName.toUpperCase()},`);
    } else if (enumTypeName) {
      let enumDescriptorName = toUpperSnaked(enumTypeName);
      importer.importIfPathExists(
        field.import,
        enumTypeName,
        enumDescriptorName
      );
      contentList.push(`
      enumDescriptor: ${enumDescriptorName},`);
    } else if (messageTypeName) {
      let messageDescriptorName = toUpperSnaked(messageTypeName);
      importer.importIfPathExists(
        field.import,
        messageTypeName,
        messageDescriptorName
      );
      contentList.push(`
      messageDescriptor: ${messageDescriptorName},`);
    }
    if (field.isArray) {
      if (messageTypeName) {
        contentList.push(`
      observableArrayFactoryFn: () => {
        return new ObservableNestedArray<any>();
      },`);
      } else {
        contentList.push(`
      observableArrayFactoryFn: () => {
        return new ObservableArray<any>();
      },`);
      }
    }
    contentList.push(`
    },`);
  }
  contentList.push(`
  ]
};
`);
}

function toCapitalized(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function toUpperSnaked(name: string): string {
  let upperCaseSnakedName = name.charAt(0);
  for (let i = 1; i < name.length; i++) {
    let char = name.charAt(i);
    if (UPPER_CASES_REGEXP.test(char)) {
      upperCaseSnakedName += "_" + char;
    } else {
      upperCaseSnakedName += char.toUpperCase();
    }
  }
  return upperCaseSnakedName;
}
