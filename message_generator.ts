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
      this.generateMessageDescriptor(node as InterfaceDeclaration);
    }

    if (node.kind === SyntaxKind.EnumDeclaration) {
      this.generateEnumDescriptor(node as EnumDeclaration);
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

  private generateMessageDescriptor(interfaceNode: InterfaceDeclaration): void {
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

    this.importFromNamedTypeDescriptor("NamedTypeDescriptor");
    this.importFromNamedTypeDescriptor("NamedTypeKind");
    let descriptorName = MessageGenerator.createDescriptorName(interfaceName);
    this.content += `
export let ${descriptorName}: NamedTypeDescriptor<${interfaceName}> = {
  name: '${interfaceName}',
  kind: NamedTypeKind.MESSAGE,
  messageFields: [`;
    if (interfaceNode.heritageClauses) {
      for (let baseType of interfaceNode.heritageClauses[0].types) {
        let baseTypeName = (baseType.expression as Identifier).text;
        let descriptorName = MessageGenerator.createDescriptorName(
          baseTypeName
        );
        this.importDescriptorIfTypeIsImported(baseTypeName, descriptorName);
        this.content += `
    ...${descriptorName}.messageFields,`;
      }
    }
    for (let member of interfaceNode.members) {
      this.importFromNamedTypeDescriptor("MessageFieldType");
      let field = member as PropertySignature;
      let fieldName = (field.name as Identifier).text;
      this.content += `
    {
      name: '${fieldName}',`;

      let fieldTypeNode: TypeNode;
      let isArray: boolean;
      if (field.type.kind !== SyntaxKind.ArrayType) {
        fieldTypeNode = field.type;
        isArray = false;
      } else {
        fieldTypeNode = (field.type as ArrayTypeNode).elementType;
        isArray = true;
      }
      let { basicType, namedType } = MessageGenerator.getVariableType(
        fieldTypeNode
      );
      if (basicType) {
        this.content += `
      type: MessageFieldType.${basicType},`;
      } else {
        let namedTypeDescriptor = MessageGenerator.createDescriptorName(
          namedType
        );
        this.importDescriptorIfTypeIsImported(namedType, namedTypeDescriptor);
        this.content += `
      type: MessageFieldType.NAMED_TYPE,
      namedTypeDescriptor: ${namedTypeDescriptor},`;
      }
      if (isArray) {
        this.content += `
      isArray: true,`;
      }
      this.content += `
    },`;
    }
    this.content += `
  ]
};
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

  private static createDescriptorName(typeName: string): string {
    let upperCaseSnakedName = typeName.charAt(0);
    for (let i = 1; i < typeName.length; i++) {
      let char = typeName.charAt(i);
      if (MessageGenerator.UPPER_CASES_REGEXP.test(char)) {
        upperCaseSnakedName += "_" + char;
      } else {
        upperCaseSnakedName += char.toUpperCase();
      }
    }
    return upperCaseSnakedName + "_DESCRIPTOR";
  }

  private static getVariableType(
    typeNode: TypeNode
  ): { basicType: string; namedType: string } {
    let basicType = "";
    if (typeNode.kind === SyntaxKind.StringKeyword) {
      basicType = "STRING";
    } else if (typeNode.kind === SyntaxKind.BooleanKeyword) {
      basicType = "BOOLEAN";
    } else if (typeNode.kind === SyntaxKind.NumberKeyword) {
      basicType = "NUMBER";
    }
    let namedType = "";
    if (typeNode.kind === SyntaxKind.TypeReference) {
      namedType = ((typeNode as TypeReferenceNode).typeName as Identifier).text;
    }
    return {
      basicType: basicType,
      namedType: namedType,
    };
  }

  private importDescriptorIfTypeIsImported(
    typeName: string,
    descriptorName: string
  ): void {
    let importPath = this.namedImportsToPath.get(typeName);
    if (importPath) {
      this.pathToNamedImports.get(importPath).add(descriptorName);
    }
  }

  private importFromNamedTypeDescriptor(toBeImported: string) {
    let namedTypeDescriptorPath = "selfage/named_type_descriptor";
    let namedImports = this.pathToNamedImports.get(namedTypeDescriptorPath);
    if (!namedImports) {
      namedImports = new Set();
      this.pathToNamedImports.set(namedTypeDescriptorPath, namedImports);
    }
    namedImports.add(toBeImported);
  }

  private generateEnumDescriptor(enumNode: EnumDeclaration): void {
    let enumName = enumNode.name.text;
    this.content += `${this.getLeadingComments(enumNode)}
export enum ${enumName} {`;
    for (let member of enumNode.members) {
      this.content += `${this.getLeadingComments(member)}
  ${(member.name as Identifier).text} = ${
        (member.initializer as NumericLiteral).text
      },`;
    }
    this.content += `
}
`;

    this.importFromNamedTypeDescriptor("NamedTypeDescriptor");
    this.importFromNamedTypeDescriptor("NamedTypeKind");
    let descriptorName = MessageGenerator.createDescriptorName(enumName);
    this.content += `
export let ${descriptorName}: NamedTypeDescriptor<${enumName}> = {
  name: '${enumName}',
  kind: NamedTypeKind.ENUM,
  enumValues: [`;
    for (let member of enumNode.members) {
      this.content += `
    {
      name: '${(member.name as Identifier).text}',
      value: ${(member.initializer as NumericLiteral).text},
    },`;
    }
    this.content += `
  ]
}
`;
  }

  private prependImports(): void {
    for (let entry of this.pathToNamedImports.entries()) {
      let importPath = entry[0];
      let namedImports = Array.from(entry[1]).join(", ");
      this.content =
        `import { ${namedImports} } from '${importPath}';\n` + this.content;
    }
  }
}
