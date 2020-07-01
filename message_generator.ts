import {
  ArrayTypeNode,
  EnumDeclaration,
  Identifier,
  ImportDeclaration,
  InterfaceDeclaration,
  NamedImports,
  Node as TsNode,
  PropertySignature,
  ScriptTarget,
  StringLiteral,
  SyntaxKind,
  TypeNode,
  TypeReferenceNode,
  createSourceFile,
  forEachChild,
} from "typescript";

export class MessageGenerator {
  private static UPPER_CASES_REGEXP = /[A-Z]/;

  private pathToNamedImports = new Map<string, Set<string>>();
  private namedImportsToPath = new Map<string, string>();
  private content = "";

  public constructor(private originalContent: string) {}

  public generate(): string {
    let sourceFile = createSourceFile(
      "placeholder",
      this.originalContent,
      ScriptTarget.ES5,
      true
    );
    forEachChild(sourceFile, (node) => this.visitTopDeclarations(node));
    this.prependImports();
    return this.content;
  }

  private visitTopDeclarations(node: TsNode): void {
    if (node.kind === SyntaxKind.ImportDeclaration) {
      this.parseImports(node as ImportDeclaration);
    }

    if (node.kind === SyntaxKind.InterfaceDeclaration) {
      this.generateMessageUtil(node as InterfaceDeclaration);
    }

    if (node.kind === SyntaxKind.EnumDeclaration) {
      this.generateEnumUtil(node as EnumDeclaration);
    }
  }

  private parseImports(importNode: ImportDeclaration): void {
    let importPath = (importNode.moduleSpecifier as StringLiteral).text;
    let namedImports: string[] = [];
    for (let importSpecifier of (importNode.importClause
      .namedBindings as NamedImports).elements) {
      let namedImport = importSpecifier.name.text;
      namedImports.push(namedImport);
      this.namedImportsToPath.set(namedImport, importPath);
    }
    this.pathToNamedImports.set(importPath, new Set(namedImports));
  }

  private generateMessageUtil(interfaceNode: InterfaceDeclaration): void {
    let interfaceName = interfaceNode.name.text;
    this.content += `${this.getLeadingComments(interfaceNode)}
export interface ${interfaceName}`;
    if (interfaceNode.heritageClauses) {
      this.content += " " + interfaceNode.heritageClauses[0].getText();
    }
    this.content += " {";

    for (let member of interfaceNode.members) {
      let field = member as PropertySignature;
      let fieldName = (field.name as Identifier).text;
      let fieldType = field.type.getText();
      this.content += `${this.getLeadingComments(member)}
  ${fieldName}?: ${fieldType},`;
    }

    this.content += `
}
`;

    this.content += `
export class ${interfaceName}Util implements MessageUtil<${interfaceName}> {
  public from(obj?: any, output?: object): ${interfaceName} {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    let ret: ${interfaceName};
    if (output) {
      ret = output;
    } else {
      ret = {};
    }`;

    if (interfaceNode.heritageClauses) {
      for (let baseType of interfaceNode.heritageClauses[0].types) {
        let baseTypeName = (baseType.expression as Identifier).text;
        let utilName = MessageGenerator.createUtilName(baseTypeName);
        this.importUtilIfTypeIsImported(baseTypeName, utilName);
        this.content += `
    ${utilName}.from(obj, ret);`;
      }
    }

    for (let member of interfaceNode.members) {
      let field = member as PropertySignature;
      let fieldName = (field.name as Identifier).text;
      if (field.type.kind !== SyntaxKind.ArrayType) {
        let {
          basicType,
          nestedType,
          nestedTypeUtil,
        } = this.getVariableTypeAndImportUtilIfNecessary(field.type);
        if (basicType) {
          this.content += `
    if (typeof obj.${fieldName} === '${basicType}') {
      ret.${fieldName} = obj.${fieldName};
    }`;
        } else if (nestedType) {
          this.content += `
    ret.${fieldName} = ${nestedTypeUtil}.from(obj.${fieldName});`;
        }
      } else {
        let {
          basicType,
          nestedType,
          nestedTypeUtil,
        } = this.getVariableTypeAndImportUtilIfNecessary(
          (field.type as ArrayTypeNode).elementType
        );

        this.content += `
    ret.${fieldName} = [];
    if (Array.isArray(obj.${fieldName})) {
      for (let element of obj.${fieldName}) {`;
        if (basicType) {
          this.content += `
        if (typeof element === '${basicType}') {
          ret.${fieldName}.push(element);
        }`;
        } else if (nestedType) {
          this.content += `
        let parsedElement = ${nestedTypeUtil}.from(element);
        if (parsedElement !== undefined) {
          ret.${fieldName}.push(parsedElement);
        }
        `;
        }
        this.content += `
      }
    }`;
      }
    }

    let singletonUtilName = MessageGenerator.createUtilName(interfaceName);
    this.content += `
    return ret;
  }
}

export let ${singletonUtilName} = new ${interfaceName}Util();
`;
  }

  private getLeadingComments(node: TsNode): string {
    let comments = this.originalContent
      .substring(node.getFullStart(), node.getStart())
      .trim();
    if (comments) {
      return "\n" + comments;
    } else {
      return "";
    }
  }

  private static createUtilName(typeName: string): string {
    let upperCaseSnakedName = typeName.charAt(0);
    for (let i = 1; i < typeName.length; i++) {
      let char = typeName.charAt(i);
      if (MessageGenerator.UPPER_CASES_REGEXP.test(char)) {
        upperCaseSnakedName += "_" + char;
      } else {
        upperCaseSnakedName += char.toUpperCase();
      }
    }
    return upperCaseSnakedName + "_UTIL";
  }

  private getVariableTypeAndImportUtilIfNecessary(
    typeNode: TypeNode
  ): { basicType: string; nestedType: string; nestedTypeUtil: string } {
    let basicType = "";
    if (typeNode.kind === SyntaxKind.StringKeyword) {
      basicType = "string";
    } else if (typeNode.kind === SyntaxKind.BooleanKeyword) {
      basicType = "boolean";
    } else if (typeNode.kind === SyntaxKind.NumberKeyword) {
      basicType = "number";
    }
    let nestedType = "";
    let nestedTypeUtil = "";
    if (typeNode.kind === SyntaxKind.TypeReference) {
      nestedType = ((typeNode as TypeReferenceNode).typeName as Identifier)
        .text;
      nestedTypeUtil = MessageGenerator.createUtilName(nestedType);
      this.importUtilIfTypeIsImported(nestedType, nestedTypeUtil);
    }
    return {
      basicType: basicType,
      nestedType: nestedType,
      nestedTypeUtil: nestedTypeUtil,
    };
  }

  private importUtilIfTypeIsImported(typeName: string, utilName: string): void {
    let importPath = this.namedImportsToPath.get(typeName);
    if (importPath) {
      this.pathToNamedImports.get(importPath).add(utilName);
    }
  }

  private generateEnumUtil(enumNode: EnumDeclaration): void {
    let enumName = enumNode.name.text;
    this.content += `${this.getLeadingComments(enumNode)}
export enum ${enumName} {`;
    for (let member of enumNode.members) {
      this.content += member.getFullText() + ",";
    }
    this.content += `
}
`;

    let singletonUtilName = MessageGenerator.createUtilName(enumName);
    this.content += `
export class ${enumName}Util implements MessageUtil<${enumName}> {
  public from(obj?: any): ${enumName} {
    if (typeof obj === 'number' && obj in ${enumName}) {
      return obj;
    }
    if (typeof obj === 'string' && obj in ${enumName}) {
      return ${enumName}[obj as keyof typeof ${enumName}];
    }
    return undefined;
  }
}

export let ${singletonUtilName} = new ${enumName}Util();
`;
  }

  private prependImports(): void {
    for (let entry of this.pathToNamedImports.entries()) {
      let importPath = entry[0];
      let namedImports = Array.from(entry[1]).join(", ");
      this.content =
        `import { ${namedImports} } from '${importPath}';\n` + this.content;
    }

    let serializerPath = "selfage/message_util";
    if (this.pathToNamedImports.has(serializerPath)) {
      return;
    }
    this.content =
      `import { MessageUtil } from '${serializerPath}';\n` + this.content;
  }
}
