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
  extends?: Array<MessageExtendDefinition>;
  isObservable?: true;
  comment?: string;
}

interface IndexProperty {
  name: string;
  descending?: boolean;
}

interface IndexDefinition {
  name: string;
  properties: Array<IndexProperty>;
}

interface DatastoreDefinition {
  messageName: string;
  import?: string;
  key: string;
  indexes?: Array<IndexDefinition>;
  comment?: string;
}

interface Definition {
  enum?: EnumDefinition;
  message?: MessageDefinition;
  datastore?: DatastoreDefinition;
}

export function generateMessage(
  modulePath: string,
  selfageDir: string
): string {
  let definitions = JSON.parse(
    fs.readFileSync(modulePath + ".json").toString()
  ) as Array<Definition>;
  let importer = new Importer(selfageDir);
  let contentList = new Array<string>();
  for (let definition of definitions) {
    if (definition.enum) {
      generateEnumDescriptor(definition.enum, importer, contentList);
    } else if (definition.message) {
      if (!definition.message.isObservable) {
        generateMessageDescriptor(
          definition.message,
          modulePath,
          importer,
          contentList
        );
      } else {
        generateObservableDescriptor(
          definition.message,
          modulePath,
          importer,
          contentList
        );
      }
    } else if (definition.datastore) {
      generateDatastoreModel(
        definition.datastore,
        modulePath,
        importer,
        contentList
      );
    } else {
      throw newInternalError("Unsupported new definition.");
    }
  }
  return [...importer.toStringList(), ...contentList].join("");
}

class TypeChecker {
  private currentDir: string;
  private currentFileBase: string;
  private cachedPathToMessages = new Map<string, Set<string>>();

  public constructor(currentModulePath: string) {
    let pathObj = path.parse(currentModulePath);
    this.currentDir = pathObj.dir;
    this.currentFileBase = pathObj.base;
  }

  public isNestedMessage(typeName: string, importPath?: string): boolean {
    if (!importPath) {
      importPath = this.currentFileBase;
    }
    let filePath = path.join(this.currentDir, importPath + ".json");
    let messages = this.cachedPathToMessages.get(filePath);
    if (!messages) {
      messages = new Set<string>();
      this.cachedPathToMessages.set(filePath, messages);
      let definitions = JSON.parse(
        fs.readFileSync(filePath).toString()
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

  public importFromDatastoreModelDescriptor(
    ...namedImports: Array<string>
  ): void {
    this.importFromPath(
      this.selfageDir + "/be/datastore_model_descriptor",
      ...namedImports
    );
  }

  public importFromMessageDescriptor(...namedImports: Array<string>): void {
    this.importFromPath(
      this.selfageDir + "/message_descriptor",
      ...namedImports
    );
  }

  public importFromObservable(...namedImports: Array<string>) {
    this.importFromPath(this.selfageDir + "/observable", ...namedImports);
  }

  public importFromObservableArray(...namedImports: Array<string>): void {
    this.importFromPath(this.selfageDir + "/observable_array", ...namedImports);
  }

  public importFromPath(
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
  importer: Importer,
  contentList: Array<string>
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

  importer.importFromMessageDescriptor("EnumDescriptor");
  let descriptorName = toUpperSnaked(enumName);
  contentList.push(`
export let ${descriptorName}: EnumDescriptor<${enumName}> = {
  name: '${enumName}',
  values: [`);
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
  currentModulePath: string,
  importer: Importer,
  contentList: Array<string>
): void {
  let typeChecker = new TypeChecker(currentModulePath);
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

  importer.importFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toUpperSnaked(messageName);
  contentList.push(`
export let ${descriptorName}: MessageDescriptor<${messageName}> = {
  name: '${messageName}',
  factoryFn: () => {
    return new Object();
  },
  fields: [`);
  if (messageDefinition.extends) {
    for (let ext of messageDefinition.extends) {
      let extDescriptorName = toUpperSnaked(ext.name);
      importer.importFromPath(ext.import, ext.name, extDescriptorName);
      contentList.push(`
    ...${extDescriptorName}.fields,`);
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
      importer.importFromMessageDescriptor("PrimitiveType");
      contentList.push(`
      primitiveType: PrimitiveType.${primitiveTypeName.toUpperCase()},`);
    } else if (enumTypeName) {
      let enumDescriptorName = toUpperSnaked(enumTypeName);
      importer.importFromPath(field.import, enumTypeName, enumDescriptorName);
      contentList.push(`
      enumDescriptor: ${enumDescriptorName},`);
    } else if (messageTypeName) {
      let messageDescriptorName = toUpperSnaked(messageTypeName);
      importer.importFromPath(
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
  currentModulePath: string,
  importer: Importer,
  contentList: Array<string>
): void {
  let typeChecker = new TypeChecker(currentModulePath);
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

  importer.importFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toUpperSnaked(messageName);
  contentList.push(`
export let ${descriptorName}: MessageDescriptor<${messageName}> = {
  name: '${messageName}',
  factoryFn: () => {
    return new ${messageName}();
  },
  fields: [`);
  if (messageDefinition.extends) {
    for (let ext of messageDefinition.extends) {
      let extDescriptorName = toUpperSnaked(ext.name);
      importer.importFromPath(ext.import, ext.name, extDescriptorName);
      contentList.push(`
    ...${extDescriptorName}.fields,`);
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
      importer.importFromMessageDescriptor("PrimitiveType");
      contentList.push(`
      primitiveType: PrimitiveType.${primitiveTypeName.toUpperCase()},`);
    } else if (enumTypeName) {
      let enumDescriptorName = toUpperSnaked(enumTypeName);
      importer.importFromPath(field.import, enumTypeName, enumDescriptorName);
      contentList.push(`
      enumDescriptor: ${enumDescriptorName},`);
    } else if (messageTypeName) {
      let messageDescriptorName = toUpperSnaked(messageTypeName);
      importer.importFromPath(
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

function generateDatastoreModel(
  datastoreDefinition: DatastoreDefinition,
  currentModulePath: string,
  importer: Importer,
  contentList: Array<string>
): void {
  let messageName = datastoreDefinition.messageName;
  let pathObj = path.parse(currentModulePath);
  let importPath: string;
  if (datastoreDefinition.import) {
    importPath = datastoreDefinition.import;
  } else {
    importPath = pathObj.base;
  }
  let filePath = path.join(pathObj.dir, importPath + ".json");
  let definitions = JSON.parse(fs.readFileSync(filePath).toString()) as Array<
    Definition
  >;
  let messageDefinition: MessageDefinition;
  for (let definition of definitions) {
    if (definition.message && definition.message.name === messageName) {
      messageDefinition = definition.message;
      break;
    }
  }
  if (!messageDefinition) {
    throw newInternalError(
      `Message definition of ${messageName} is not found at ${filePath}.`
    );
  }

  let fieldToDefinitions = new Map<string, MessageFieldDefinition>();
  let excludedIndexes = new Set<string>();
  for (let field of messageDefinition.fields) {
    fieldToDefinitions.set(field.name, field);
    excludedIndexes.add(field.name);
  }
  if (datastoreDefinition.indexes) {
    for (let index of datastoreDefinition.indexes) {
      importer.importFromDatastoreModelDescriptor(
        "DatastoreQuery",
        "DatastoreFilter",
        "DatastoreOrdering",
        "Operator"
      );
      contentList.push(`
export class ${index.name}QueryBuilder {
  private datastoreQuery: DatastoreQuery<${messageName}>;

  public constructor() {
    let filters = new Array<DatastoreFilter>();
    let orderings = new Array<DatastoreOrdering>();`);
      for (let property of index.properties) {
        if (property.descending !== undefined) {
          contentList.push(`
    orderings.push({
      indexName: "${property.name}",
      descending: ${property.descending}
    });`);
        }
      }
      contentList.push(`
    this.datastoreQuery = {filters: filters, orderings: orderings};
  }
  public start(token: string): this {
    this.datastoreQuery.startToken = token;
    return this;
  }
  public limit(num: number): this {
    this.datastoreQuery.limit = num;
    return this;
  }`);
      for (let property of index.properties) {
        if (!fieldToDefinitions.has(property.name)) {
          throw newInternalError(
            `Index ${property.name} is not defined from ${messageName}.`
          );
        }
        excludedIndexes.delete(property.name);
        contentList.push(`
  public filterBy${toCapitalized(property.name)}(operator: Operator, value: ${
          fieldToDefinitions.get(property.name).type
        }): this {
    this.datastoreQuery.filters.push({
      indexName: "${property.name}",
      indexValue: value,
      operator: operator,
    });
    return this;
  }`);
      }
      contentList.push(`
  public build(): DatastoreQuery<${messageName}> {
    return this.datastoreQuery;
  }
}
`);
    }
  }

  let keyDefinition = fieldToDefinitions.get(datastoreDefinition.key);
  if (!keyDefinition) {
    throw newInternalError(
      `Datastore key ${datastoreDefinition.key} is not found from ` +
        `${messageName}.`
    );
  }
  if (
    keyDefinition.type !== PRIMITIVE_TYPE_STRING &&
    keyDefinition.type !== PRIMITIVE_TYPE_NUMBER
  ) {
    throw newInternalError(
      `Datastore key only be a string or a number, but it is ` +
        `${keyDefinition.type}.`
    );
  }
  if (keyDefinition.isArray) {
    throw newInternalError(`Datastore key cannot be an array.`);
  }
  let messageDescriptorName = toUpperSnaked(messageName);
  importer.importFromPath(
    datastoreDefinition.import,
    messageName,
    messageDescriptorName
  );
  importer.importFromDatastoreModelDescriptor("DatastoreModelDescriptor");
  contentList.push(`${generateComment(datastoreDefinition.comment)}
export let ${messageDescriptorName}_MODEL: DatastoreModelDescriptor<${messageName}> = {
  name: "${messageName}",
  key: "${datastoreDefinition.key}",
  excludedIndexes: ["${Array.from(excludedIndexes).join(`","`)}"],
  valueDescriptor: ${messageDescriptorName},
}
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
