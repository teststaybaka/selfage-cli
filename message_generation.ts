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
  TypeNode,
  TypeReferenceNode,
  createCompilerHost,
  createProgram,
  forEachChild,
} from "typescript";

let UPPER_CASES_REGEXP = /[A-Z]/;
let MSG_FILE_SUFFIX = /_msg$/;

export function generateMessage(
  modulePath: string,
  selfageDir: string
): { filename: string; content: string } {
  let filename = modulePath + ".ts";
  let program = createProgram([filename], {}, createCompilerHost({}, true));
  let sourceFile = program.getSourceFile(filename);

  let contentList = new Array<string>();
  let importer = new Importer(selfageDir);
  forEachChild(sourceFile, (node) => {
    visitTopDeclarations(node, contentList, importer);
  });
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

  public addDescriptorIfTypeImported(
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

  public addNamedImportsFromNamedTypeDescriptor(
    ...namedImports: Array<string>
  ): void {
    Importer.addNamedImports(
      this.pathToNamedImports,
      this.namedImportToPaths,
      this.selfageDir + "/named_type_descriptor",
      ...namedImports
    );
  }

  public addNamedImportsWhileStripSuffix(
    path: string,
    ...namedImports: Array<string>
  ): void {
    path = path.replace(MSG_FILE_SUFFIX, "");
    Importer.addNamedImports(
      this.pathToNamedImports,
      this.namedImportToPaths,
      path,
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

  importer.addNamedImportsFromNamedTypeDescriptor(
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
    let fieldType = field.type.getText();
    contentList.push(`${getLeadingComments(member)}
  ${fieldName}?: ${fieldType},`);
  }
  contentList.push(`
}
`);

  importer.addNamedImportsFromNamedTypeDescriptor(
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
      importer.addDescriptorIfTypeImported(baseTypeName, descriptorName);
      contentList.push(`
    ...${descriptorName}.messageFields,`);
    }
  }
  for (let member of interfaceNode.members) {
    importer.addNamedImportsFromNamedTypeDescriptor("MessageFieldType");
    let field = member as PropertySignature;
    let fieldName = (field.name as Identifier).text;
    contentList.push(`
    {
      name: '${fieldName}',`);

    let fieldTypeNode: TypeNode;
    let isArray: boolean;
    if (field.type.kind !== SyntaxKind.ArrayType) {
      fieldTypeNode = field.type;
      isArray = false;
    } else {
      fieldTypeNode = (field.type as ArrayTypeNode).elementType;
      isArray = true;
    }
    let { basicType, namedType } = getFieldTypeText(fieldTypeNode);
    if (basicType) {
      contentList.push(`
      type: MessageFieldType.${basicType.toUpperCase()},`);
    } else {
      let namedTypeDescriptor = toDescriptorName(namedType);
      importer.addDescriptorIfTypeImported(namedType, namedTypeDescriptor);
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

function getFieldTypeText(
  fieldTypeNode: TypeNode
): { basicType: string; namedType: string } {
  let basicType = "";
  if (
    fieldTypeNode.kind === SyntaxKind.StringKeyword ||
    fieldTypeNode.kind === SyntaxKind.BooleanKeyword ||
    fieldTypeNode.kind === SyntaxKind.NumberKeyword
  ) {
    basicType = fieldTypeNode.getText();
  }
  let namedType = "";
  if (fieldTypeNode.kind === SyntaxKind.TypeReference) {
    namedType = ((fieldTypeNode as TypeReferenceNode).typeName as Identifier)
      .text;
  }
  return {
    basicType: basicType,
    namedType: namedType,
  };
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

function visitTopDeclarations(
  node: TsNode,
  contentList: Array<string>,
  importer: Importer
): void {
  if (node.kind === SyntaxKind.ImportDeclaration) {
    parseImports(node as ImportDeclaration, importer);
  } else if (node.kind === SyntaxKind.InterfaceDeclaration) {
    generateMessageDescriptor(
      node as InterfaceDeclaration,
      contentList,
      importer
    );
  } else if (node.kind === SyntaxKind.EnumDeclaration) {
    generateEnumDescriptor(node as EnumDeclaration, contentList, importer);
  }
}
