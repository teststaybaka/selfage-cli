import { newInternalError } from "selfage/errors";
import {
  ArrayTypeNode,
  EnumDeclaration,
  Identifier,
  ImportDeclaration,
  InterfaceDeclaration,
  NamedImports,
  Node as TsNode,
  NumericLiteral,
  PropertySignature,
  StringLiteral,
  SyntaxKind,
  TypeChecker,
  TypeNode,
  createCompilerHost,
  createProgram,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
} from "typescript";

let UPPER_CASES_REGEXP = /[A-Z]/;
let MSG_FILE_SUFFIX = /_msg$/;
let OBSERVABLE_ANNOTATION = /^\s*(\/\/|\*+)\s*@Observable\s*$/m;

export function generateMessage(
  modulePath: string,
  selfageDir: string
): { filename: string; content: string } {
  if (modulePath.search(MSG_FILE_SUFFIX) === -1) {
    throw newInternalError(
      `File name must end with "_msg", it's ${modulePath}.`
    );
  }

  let filename = modulePath + ".ts";
  let program = createProgram([filename], {}, createCompilerHost({}, true));
  let diagnostics = getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    for (let diagnostic of diagnostics) {
      console.error(flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
    throw newInternalError(`Failed to compile ${filename}.`);
  }

  let checker = program.getTypeChecker();
  let sourceFile = program.getSourceFile(filename);

  let contentList = new Array<string>();
  let importer = new Importer(selfageDir);
  for (let node of sourceFile.statements) {
    if (node.kind === SyntaxKind.ImportDeclaration) {
      parseImports(node as ImportDeclaration, importer);
    } else if (node.kind === SyntaxKind.InterfaceDeclaration) {
      let comments = getLeadingComments(node);
      if (!OBSERVABLE_ANNOTATION.test(comments)) {
        generateMessageDescriptor(
          node as InterfaceDeclaration,
          checker,
          contentList,
          importer
        );
      } else {
        generateObservableDescriptor(
          node as InterfaceDeclaration,
          checker,
          contentList,
          importer
        );
      }
    } else if (node.kind === SyntaxKind.EnumDeclaration) {
      generateEnumDescriptor(node as EnumDeclaration, contentList, importer);
    }
  }
  contentList = [...importer.toStringList(), ...contentList];
  return {
    filename: modulePath.replace(MSG_FILE_SUFFIX, "") + ".ts",
    content: contentList.join(""),
  };
}

class Importer {
  private pathToNamedImports = new Map<string, Set<string>>();
  private namedImportToPaths = new Map<string, string>();

  public constructor(private selfageDir: string) {}

  public importDescriptorIfTypeImported(
    typeName: string,
    descriptorName: string
  ): void {
    let path = this.namedImportToPaths.get(typeName);
    if (path) {
      Importer.addNamedImports(
        this.pathToNamedImports,
        this.namedImportToPaths,
        path,
        descriptorName
      );
    }
  }

  public importsFromMessageDescriptor(...namedImports: Array<string>): void {
    Importer.addNamedImports(
      this.pathToNamedImports,
      this.namedImportToPaths,
      this.selfageDir + "/message_descriptor",
      ...namedImports
    );
  }

  public importFromObservable(...namedImports: Array<string>) {
    Importer.addNamedImports(
      this.pathToNamedImports,
      this.namedImportToPaths,
      this.selfageDir + "/observable",
      ...namedImports
    );
  }

  public importFromObservableArray(...namedImports: Array<string>): void {
    Importer.addNamedImports(
      this.pathToNamedImports,
      this.namedImportToPaths,
      this.selfageDir + "/observable_array",
      ...namedImports
    );
  }

  public addNamedImportsWhileStripSuffix(
    path: string,
    ...namedImports: Array<string>
  ): void {
    Importer.addNamedImports(
      this.pathToNamedImports,
      this.namedImportToPaths,
      path.replace(MSG_FILE_SUFFIX, ""),
      ...namedImports
    );
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

  private static addNamedImports(
    pathToNamedImports: Map<string, Set<string>>,
    namedImportToPaths: Map<string, string>,
    path: string,
    ...namedImports: Array<string>
  ): void {
    let namedImportsInMap = pathToNamedImports.get(path);
    if (!namedImportsInMap) {
      namedImportsInMap = new Set<string>();
      pathToNamedImports.set(path, namedImportsInMap);
    }
    for (let namedImport of namedImports) {
      namedImportsInMap.add(namedImport);
      namedImportToPaths.set(namedImport, path);
    }
  }
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function flattenArrayType(
  typeNode: TypeNode
): { typeNode: TypeNode; isArray: boolean } {
  if (typeNode.kind !== SyntaxKind.ArrayType) {
    return {
      typeNode: typeNode,
      isArray: false,
    };
  } else {
    return {
      typeNode: (typeNode as ArrayTypeNode).elementType,
      isArray: true,
    };
  }
}

function flattenFieldType(
  checker: TypeChecker,
  fieldTypeNode: TypeNode
): {
  primitiveTypeName?: string;
  enumTypeName?: string;
  messageTypeName?: string;
} {
  if (
    fieldTypeNode.kind === SyntaxKind.StringKeyword ||
    fieldTypeNode.kind === SyntaxKind.BooleanKeyword ||
    fieldTypeNode.kind === SyntaxKind.NumberKeyword
  ) {
    return {
      primitiveTypeName: fieldTypeNode.getText(),
    };
  }
  let typeDeclaration = checker.getTypeFromTypeNode(fieldTypeNode).symbol
    .declarations[0];
  if (
    typeDeclaration.kind === SyntaxKind.EnumDeclaration ||
    // When an enum only has one member, TypeScript will optimize it to be a
    // literal type with the only enum value.
    typeDeclaration.kind === SyntaxKind.EnumMember
  ) {
    return {
      enumTypeName: fieldTypeNode.getText(),
    };
  } else if (typeDeclaration.kind === SyntaxKind.InterfaceDeclaration) {
    return {
      messageTypeName: fieldTypeNode.getText(),
    };
  }
  throw newInternalError(
    `Cannot determine declaration type of ${fieldTypeNode.getText()}.`
  );
}

function generateEnumDescriptor(
  enumNode: EnumDeclaration,
  contentList: Array<string>,
  importer: Importer
): void {
  let enumName = enumNode.name.text;
  contentList.push(`${getLeadingComments(enumNode)}
export enum ${enumName} {`);
  for (let member of enumNode.members) {
    contentList.push(`${getLeadingComments(member)}
  ${(member.name as Identifier).text} = ${
      (member.initializer as NumericLiteral).text
    },`);
  }
  contentList.push(`
}
`);

  importer.importsFromMessageDescriptor("EnumDescriptor");
  let descriptorName = toDescriptorName(enumName);
  contentList.push(`
export let ${descriptorName}: EnumDescriptor<${enumName}> = {
  name: '${enumName}',
  enumValues: [`);
  for (let member of enumNode.members) {
    contentList.push(`
    {
      name: '${(member.name as Identifier).text}',
      value: ${(member.initializer as NumericLiteral).text},
    },`);
  }
  contentList.push(`
  ]
}
`);
}

function generateMessageDescriptor(
  interfaceNode: InterfaceDeclaration,
  checker: TypeChecker,
  contentList: Array<string>,
  importer: Importer
): void {
  let interfaceName = interfaceNode.name.text;
  contentList.push(`${getLeadingComments(interfaceNode)}
export interface ${interfaceName}`);
  if (interfaceNode.heritageClauses) {
    contentList.push(" " + interfaceNode.heritageClauses[0].getText());
  }
  contentList.push(" {");
  for (let member of interfaceNode.members) {
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    let { typeNode: fieldTypeNode, isArray } = flattenArrayType(field.type);
    let fieldTypeName: string;
    if (isArray) {
      fieldTypeName = `Array<${fieldTypeNode.getText()}>`;
    } else {
      fieldTypeName = fieldTypeNode.getText();
    }
    contentList.push(`${getLeadingComments(member)}
  ${fieldName}?: ${fieldTypeName},`);
  }
  contentList.push(`
}
`);

  importer.importsFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toDescriptorName(interfaceName);
  contentList.push(`
export let ${descriptorName}: MessageDescriptor<${interfaceName}> = {
  name: '${interfaceName}',
  factoryFn: () => {
    return new Object();
  },
  messageFields: [`);
  if (interfaceNode.heritageClauses) {
    for (let baseType of interfaceNode.heritageClauses[0].types) {
      let baseTypeName = (baseType.expression as Identifier).text;
      let descriptorName = toDescriptorName(baseTypeName);
      importer.importDescriptorIfTypeImported(baseTypeName, descriptorName);
      contentList.push(`
    ...${descriptorName}.messageFields,`);
    }
  }
  for (let member of interfaceNode.members) {
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    contentList.push(`
    {
      name: '${fieldName}',`);
    let { typeNode: fieldTypeNode, isArray } = flattenArrayType(field.type);
    let { primitiveTypeName, enumTypeName, messageTypeName } = flattenFieldType(
      checker,
      fieldTypeNode
    );
    if (primitiveTypeName) {
      importer.importsFromMessageDescriptor("PrimitiveType");
      contentList.push(`
      primitiveType: PrimitiveType.${primitiveTypeName.toUpperCase()},`);
    } else if (enumTypeName) {
      let enumDescriptorName = toDescriptorName(enumTypeName);
      importer.importDescriptorIfTypeImported(enumTypeName, enumDescriptorName);
      contentList.push(`
      enumDescriptor: ${enumDescriptorName},`);
    } else if (messageTypeName) {
      let messageDescriptorName = toDescriptorName(messageTypeName);
      importer.importDescriptorIfTypeImported(
        messageTypeName,
        messageDescriptorName
      );
      contentList.push(`
      messageDescriptor: ${messageDescriptorName},`);
    }
    if (isArray) {
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
  interfaceNode: InterfaceDeclaration,
  checker: TypeChecker,
  contentList: Array<string>,
  importer: Importer
): void {
  let interfaceName = interfaceNode.name.text;
  contentList.push(`${getLeadingComments(interfaceNode)}
export class ${interfaceName}`);
  if (interfaceNode.heritageClauses) {
    contentList.push(" " + interfaceNode.heritageClauses[0].getText());
  }
  importer.importFromObservable("Observable");
  contentList.push(` implements Observable {
  public onChange: () => void;`);
  for (let member of interfaceNode.members) {
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    let { typeNode: fieldTypeNode, isArray } = flattenArrayType(field.type);
    let { messageTypeName } = flattenFieldType(checker, fieldTypeNode);
    let fieldTypeName: string;
    if (isArray) {
      if (messageTypeName) {
        importer.importFromObservableArray("ObservableNestedArray");
        fieldTypeName = `ObservableNestedArray<${fieldTypeNode.getText()}>`;
      } else {
        importer.importFromObservableArray("ObservableArray");
        fieldTypeName = `ObservableArray<${fieldTypeNode.getText()}>`;
      }
    } else {
      fieldTypeName = fieldTypeNode.getText();
    }
    contentList.push(`
  ${getLeadingComments(member)}
  public on${capitalize(
    fieldName
  )}Change: (newValue: ${fieldTypeName}, oldValue: ${fieldTypeName}) => void;
  private ${fieldName}_?: ${fieldTypeName};
  get ${fieldName}(): ${fieldTypeName} {
    return this.${fieldName}_;
  }
  set ${fieldName}(value: ${fieldTypeName}) {
    let oldValue = this.${fieldName}_;
    this.${fieldName}_ = value;`);
    if (isArray || messageTypeName) {
      contentList.push(`
    if (oldValue !== undefined) {
      oldValue.onChange = undefined;
    }
    this.${fieldName}_.onChange = () => {
      if (this.onChange) {
        this.onChange();
      }
    };`);
    }
    contentList.push(`
    if (this.on${capitalize(fieldName)}Change) {
      this.on${capitalize(fieldName)}Change(this.${fieldName}_, oldValue);
    }
    if (this.onChange) {
      this.onChange();
    }
  }`);
  }
  contentList.push(`

  public emitInitialEvents(): void {`);
  for (let member of interfaceNode.members) {
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    contentList.push(`
    if (this.on${capitalize(fieldName)}Change) {
      this.on${capitalize(fieldName)}Change(this.${fieldName}_, undefined);
    }`);
  }
  contentList.push(`
  }

  public toJSON(): Object {
    return {`);
  for (let member of interfaceNode.members) {
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    contentList.push(`
      ${fieldName}: this.${fieldName},`);
  }
  contentList.push(`
    };
  }
}
`);

  importer.importsFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toDescriptorName(interfaceName);
  contentList.push(`
export let ${descriptorName}: MessageDescriptor<${interfaceName}> = {
  name: '${interfaceName}',
  factoryFn: () => {
    return new ${interfaceName}();
  },
  messageFields: [`);
  if (interfaceNode.heritageClauses) {
    for (let baseType of interfaceNode.heritageClauses[0].types) {
      let baseTypeName = (baseType.expression as Identifier).text;
      let descriptorName = toDescriptorName(baseTypeName);
      importer.importDescriptorIfTypeImported(baseTypeName, descriptorName);
      contentList.push(`
    ...${descriptorName}.messageFields,`);
    }
  }
  for (let member of interfaceNode.members) {
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    contentList.push(`
    {
      name: '${fieldName}',`);
    let { typeNode: fieldTypeNode, isArray } = flattenArrayType(field.type);
    let { primitiveTypeName, enumTypeName, messageTypeName } = flattenFieldType(
      checker,
      fieldTypeNode
    );
    if (primitiveTypeName) {
      importer.importsFromMessageDescriptor("PrimitiveType");
      contentList.push(`
      primitiveType: PrimitiveType.${primitiveTypeName.toUpperCase()},`);
    } else if (enumTypeName) {
      let enumDescriptorName = toDescriptorName(enumTypeName);
      importer.importDescriptorIfTypeImported(enumTypeName, enumDescriptorName);
      contentList.push(`
      enumDescriptor: ${enumDescriptorName},`);
    } else if (messageTypeName) {
      let messageDescriptorName = toDescriptorName(messageTypeName);
      importer.importDescriptorIfTypeImported(
        messageTypeName,
        messageDescriptorName
      );
      contentList.push(`
      messageDescriptor: ${messageDescriptorName},`);
    }
    if (isArray) {
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

function getLeadingComments(node: TsNode): string {
  let comments = node
    .getFullText()
    .substring(0, node.getStart() - node.getFullStart())
    .trim();
  if (comments) {
    return "\n" + comments;
  } else {
    return "";
  }
}

function parseImports(importNode: ImportDeclaration, importer: Importer): void {
  let importPath = (importNode.moduleSpecifier as StringLiteral).text;
  let namedImports = new Array<string>();
  for (let importSpecifier of (importNode.importClause
    .namedBindings as NamedImports).elements) {
    namedImports.push(importSpecifier.name.text);
  }
  importer.addNamedImportsWhileStripSuffix(importPath, ...namedImports);
}

function toDescriptorName(typeName: string): string {
  let upperCaseSnakedName = typeName.charAt(0);
  for (let i = 1; i < typeName.length; i++) {
    let char = typeName.charAt(i);
    if (UPPER_CASES_REGEXP.test(char)) {
      upperCaseSnakedName += "_" + char;
    } else {
      upperCaseSnakedName += char.toUpperCase();
    }
  }
  return upperCaseSnakedName;
}
