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
  TypeReferenceNode,
  createCompilerHost,
  createProgram,
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

  public importsFromNamedTypeDescriptor(...namedImports: Array<string>): void {
    Importer.addNamedImports(
      this.pathToNamedImports,
      this.namedImportToPaths,
      this.selfageDir + "/named_type_descriptor",
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

function checkForArrayType(
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

function checkForBasicOrNamedType(
  fieldTypeNode: TypeNode
): { basicType: string; namedType: string } {
  let basicType: string;
  if (
    fieldTypeNode.kind === SyntaxKind.StringKeyword ||
    fieldTypeNode.kind === SyntaxKind.BooleanKeyword ||
    fieldTypeNode.kind === SyntaxKind.NumberKeyword
  ) {
    basicType = fieldTypeNode.getText();
  }
  let namedType: string;
  if (fieldTypeNode.kind === SyntaxKind.TypeReference) {
    namedType = ((fieldTypeNode as TypeReferenceNode).typeName as Identifier)
      .text;
  }
  return {
    basicType: basicType,
    namedType: namedType,
  };
}

function isInterfaceType(checker: TypeChecker, typeNode: TypeNode): boolean {
  if (
    typeNode.kind === SyntaxKind.StringKeyword ||
    typeNode.kind === SyntaxKind.BooleanKeyword ||
    typeNode.kind === SyntaxKind.NumberKeyword
  ) {
    return false;
  }
  let type = checker.getTypeFromTypeNode(typeNode);
  return type.symbol.declarations[0].kind === SyntaxKind.InterfaceDeclaration;
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

  importer.importsFromNamedTypeDescriptor(
    "NamedTypeDescriptor",
    "NamedTypeKind"
  );
  let descriptorName = toDescriptorName(enumName);
  contentList.push(`
export let ${descriptorName}: NamedTypeDescriptor<${enumName}> = {
  name: '${enumName}',
  kind: NamedTypeKind.ENUM,
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
    let { typeNode: fieldTypeNode, isArray } = checkForArrayType(field.type);
    let fieldType: string;
    if (isArray) {
      fieldType = `Array<${fieldTypeNode.getText()}>`;
    } else {
      fieldType = fieldTypeNode.getText();
    }
    contentList.push(`${getLeadingComments(member)}
  ${fieldName}?: ${fieldType},`);
  }
  contentList.push(`
}
`);

  importer.importsFromNamedTypeDescriptor(
    "NamedTypeDescriptor",
    "NamedTypeKind"
  );
  let descriptorName = toDescriptorName(interfaceName);
  contentList.push(`
export let ${descriptorName}: NamedTypeDescriptor<${interfaceName}> = {
  name: '${interfaceName}',
  kind: NamedTypeKind.MESSAGE,
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
    importer.importsFromNamedTypeDescriptor("MessageFieldType");
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    contentList.push(`
    {
      name: '${fieldName}',`);

    let { typeNode: fieldTypeNode, isArray } = checkForArrayType(field.type);
    let { basicType, namedType } = checkForBasicOrNamedType(fieldTypeNode);
    if (basicType) {
      contentList.push(`
      type: MessageFieldType.${basicType.toUpperCase()},`);
    } else {
      let namedTypeDescriptor = toDescriptorName(namedType);
      importer.importDescriptorIfTypeImported(namedType, namedTypeDescriptor);
      contentList.push(`
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: ${namedTypeDescriptor},`);
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
    let { typeNode: fieldTypeNode, isArray } = checkForArrayType(field.type);
    let isInterface = isInterfaceType(checker, fieldTypeNode);
    let fieldType: string;
    if (isArray) {
      if (isInterface) {
        importer.importFromObservableArray("ObservableNestedArray");
        fieldType = `ObservableNestedArray<${fieldTypeNode.getText()}>`;
      } else {
        importer.importFromObservableArray("ObservableArray");
        fieldType = `ObservableArray<${fieldTypeNode.getText()}>`;
      }
    } else {
      fieldType = fieldTypeNode.getText();
    }
    contentList.push(`
  ${getLeadingComments(member)}
  public on${capitalize(
    fieldName
  )}Change: (newValue: ${fieldType}, oldValue: ${fieldType}) => void;
  private ${fieldName}_?: ${fieldType};
  get ${fieldName}(): ${fieldType} {
    return this.${fieldName}_;
  }
  set ${fieldName}(value: ${fieldType}) {
    let oldValue = this.${fieldName}_;
    this.${fieldName}_ = value;`);
    if (isArray || isInterface) {
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
}
`);

  importer.importsFromNamedTypeDescriptor(
    "NamedTypeDescriptor",
    "NamedTypeKind"
  );
  let descriptorName = toDescriptorName(interfaceName);
  contentList.push(`
export let ${descriptorName}: NamedTypeDescriptor<${interfaceName}> = {
  name: '${interfaceName}',
  kind: NamedTypeKind.MESSAGE,
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
    importer.importsFromNamedTypeDescriptor("MessageFieldType");
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    contentList.push(`
    {
      name: '${fieldName}',`);

    let { typeNode: fieldTypeNode, isArray } = checkForArrayType(field.type);
    let { basicType, namedType } = checkForBasicOrNamedType(fieldTypeNode);
    if (basicType) {
      contentList.push(`
      type: MessageFieldType.${basicType.toUpperCase()},`);
    } else {
      let namedTypeDescriptor = toDescriptorName(namedType);
      importer.importDescriptorIfTypeImported(namedType, namedTypeDescriptor);
      contentList.push(`
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: ${namedTypeDescriptor},`);
    }
    if (isArray) {
      let isInterface = isInterfaceType(checker, fieldTypeNode);
      if (isInterface) {
        contentList.push(`
      arrayFactoryFn: () => {
        return new ObservableNestedArray<any>();
      },`);
      } else {
        contentList.push(`
      arrayFactoryFn: () => {
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
