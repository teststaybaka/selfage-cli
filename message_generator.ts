import { readFileSync, writeFileSync } from "fs";
import {
  forEachChild,
  createSourceFile,
  ScriptTarget,
  SyntaxKind,
  Node as TsNode,
  ImportDeclaration,
  InterfaceDeclaration,
  EnumDeclaration,
  StringLiteral,
  NamedImports,
  Identifier,
  PropertySignature,
  TypeReferenceNode,
  NumericLiteral,
} from "typescript";

export class MessageGenerator {
  private static UPPER_CASES_REGEXP = /[A-Z]/;

  private pathToNamedImports = new Map<string, Set<string>>();
  private namedImportsToPath = new Map<string, string>();
  private content = "";

  public constructor(private fileName: string, private dryRun: boolean) {}

  public generate(): void {
    let sourceFile = createSourceFile(
      this.fileName,
      readFileSync(this.fileName).toString(),
      ScriptTarget.ES5,
      false
    );
    forEachChild(sourceFile, (node) => this.visitTopDeclarations(node));
    this.prependImports();
    if (this.dryRun) {
      console.log(this.content);
    } else {
      writeFileSync(this.fileName, this.content);
    }
  }

  private visitTopDeclarations(node: TsNode): void {
    if (node.kind === SyntaxKind.ImportDeclaration) {
      this.parseImports(node as ImportDeclaration);
    }

    if (node.kind === SyntaxKind.InterfaceDeclaration) {
      this.generateMessageParser(node as InterfaceDeclaration);
    }

    if (node.kind === SyntaxKind.EnumDeclaration) {
      this.generateEnumParser(node as EnumDeclaration);
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

  private generateMessageParser(interfaceNode: InterfaceDeclaration): void {
    let interfaceName = interfaceNode.name.text;
    this.content += `
export interface ${interfaceName}`;

    if (interfaceNode.heritageClauses) {
      this.content += " extends";
      let isFirst = true;
      for (let baseType of interfaceNode.heritageClauses[0].types) {
        if (isFirst) {
          this.content += ` ${(baseType.expression as Identifier).text}`;
          isFirst = false;
        } else {
          this.content += `, ${(baseType.expression as Identifier).text}`;
        }
      }
    }
    this.content += " {";

    for (let member of interfaceNode.members) {
      let field = member as PropertySignature;
      let fieldName = (field.name as Identifier).text;
      let fieldType = "";
      if (field.type.kind === SyntaxKind.StringKeyword) {
        fieldType = "string";
      } else if (field.type.kind === SyntaxKind.BooleanKeyword) {
        fieldType = "boolean";
      } else if (field.type.kind === SyntaxKind.NumberKeyword) {
        fieldType = "number";
      } else if (field.type.kind === SyntaxKind.TypeReference) {
        fieldType = ((field.type as TypeReferenceNode).typeName as Identifier)
          .text;
      }
      this.content += `
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
        let utilName = this.createUtilName(baseTypeName);
        this.importUtilIfTypeIsImported(baseTypeName, utilName);
        this.content += `
    ${utilName}.from(obj, ret);`;
      }
    }

    for (let member of interfaceNode.members) {
      let field = member as PropertySignature;
      let fieldName = (field.name as Identifier).text;
      let fieldType = "";
      if (field.type.kind === SyntaxKind.StringKeyword) {
        fieldType = "string";
      } else if (field.type.kind === SyntaxKind.BooleanKeyword) {
        fieldType = "boolean";
      } else if (field.type.kind === SyntaxKind.NumberKeyword) {
        fieldType = "number";
      }
      let nestedFieldType = "";
      if (field.type.kind === SyntaxKind.TypeReference) {
        nestedFieldType = ((field.type as TypeReferenceNode)
          .typeName as Identifier).text;
      }

      if (fieldType) {
        this.content += `
    if (typeof obj.${fieldName} === '${fieldType}') {
      ret.${fieldName} = obj.${fieldName};
    }`;
      } else if (nestedFieldType) {
        let utilName = this.createUtilName(nestedFieldType);
        this.importUtilIfTypeIsImported(nestedFieldType, utilName);
        this.content += `
    ret.${fieldName} = ${utilName}.from(obj.${fieldName});`;
      }
    }

    let singletonUtilName = this.createUtilName(interfaceName);
    this.content += `
    return ret;
  }
}

export let ${singletonUtilName} = new ${interfaceName}Util();
`;
  }

  private createUtilName(typeName: string): string {
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

  private importUtilIfTypeIsImported(typeName: string, utilName: string): void {
    let importPath = this.namedImportsToPath.get(typeName);
    if (importPath) {
      this.pathToNamedImports.get(importPath).add(utilName);
    }
  }

  private generateEnumParser(enumNode: EnumDeclaration): void {
    let enumName = enumNode.name.text;
    this.content += `
export enum ${enumName} {`;

    for (let member of enumNode.members) {
      let enumValueName = (member.name as Identifier).text;
      let enumValueValue = (member.initializer as NumericLiteral).text;
      this.content += `
  ${enumValueName} = ${enumValueValue},`;
    }

    this.content += `
}
`;

    let singletonUtilName = this.createUtilName(enumName);
    this.content += `
export class ${enumName}Util implements MessageUtil<${enumName}> {
  public from(obj?: any): ${enumName} {
    if (!obj || typeof obj !== 'number' || !(obj in ${enumName})) {
      return undefined;
    } else {
      return obj;
    }
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
