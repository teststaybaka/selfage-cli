import {
  ExternalModuleReference,
  ImportDeclaration,
  ImportEqualsDeclaration,
  NamedImports,
  NamespaceImport,
  Node as TsNode,
  ScriptTarget,
  StringLiteral,
  SyntaxKind,
  createSourceFile,
} from "typescript";

export class ImportsSorter {
  private equalImports: Map<string, string> = new Map();
  private defaultImports: Map<string, string> = new Map();
  private namespaceImports: Map<string, string> = new Map();
  private namedImports: Map<string, Set<string>> = new Map();
  private sideEffectImports: Set<string> = new Set();
  private content = "";

  public constructor(private originalContent: string) {}

  public sort(): string {
    let sourceFile = createSourceFile(
      "placeholder",
      this.originalContent,
      ScriptTarget.ES5,
      true
    );

    let endPos = 0;
    for (let node of sourceFile.statements) {
      if (node.kind === SyntaxKind.ImportEqualsDeclaration) {
        let importNode = node as ImportEqualsDeclaration;
        this.equalImports.set(
          ((importNode.moduleReference as ExternalModuleReference)
            .expression as StringLiteral).text,
          importNode.name.text
        );
        this.writeUncapturedContentInBetween(node);
        endPos = ImportsSorter.getEnd(node);
        continue;
      } else if (node.kind === SyntaxKind.ImportDeclaration) {
        let importNode = node as ImportDeclaration;
        let importPath = (importNode.moduleSpecifier as StringLiteral).text;
        if (!importNode.importClause) {
          this.sideEffectImports.add(importPath);
          this.writeUncapturedContentInBetween(node);
          endPos = ImportsSorter.getEnd(node);
          continue;
        } else if (!importNode.importClause.namedBindings) {
          this.defaultImports.set(
            importPath,
            importNode.importClause.name.text
          );
          this.writeUncapturedContentInBetween(node);
          endPos = ImportsSorter.getEnd(node);
          continue;
        } else if (
          importNode.importClause.namedBindings.kind ===
          SyntaxKind.NamespaceImport
        ) {
          this.namespaceImports.set(
            importPath,
            (importNode.importClause.namedBindings as NamespaceImport).name.text
          );
          this.writeUncapturedContentInBetween(node);
          endPos = ImportsSorter.getEnd(node);
          continue;
        } else if (
          importNode.importClause.namedBindings.kind === SyntaxKind.NamedImports
        ) {
          if (!this.namedImports.has(importPath)) {
            this.namedImports.set(importPath, new Set());
          }
          let names = this.namedImports.get(importPath);
          for (let specifier of (importNode.importClause
            .namedBindings as NamedImports).elements) {
            names.add(specifier.getText());
          }
          this.writeUncapturedContentInBetween(node);
          endPos = ImportsSorter.getEnd(node);
          continue;
        }
      }
      break;
    }

    for (let path of [...this.equalImports.keys()].sort()) {
      let name = this.equalImports.get(path);
      this.content += `import ${name} = require('${path}');\n`;
    }
    for (let path of [...this.defaultImports.keys()].sort()) {
      let name = this.defaultImports.get(path);
      this.content += `import ${name} from '${path}';\n`;
    }
    for (let path of [...this.namespaceImports.keys()].sort()) {
      let name = this.namespaceImports.get(path);
      this.content += `import * as ${name} from '${path}';\n`;
    }
    for (let path of [...this.namedImports.keys()].sort()) {
      let names = this.namedImports.get(path);
      let sortedNames = [...names].sort();
      this.content += `import { ${sortedNames.join(",")} } from '${path}';\n`;
    }
    for (let path of [...this.sideEffectImports].sort()) {
      this.content += `import '${path}';\n`;
    }
    this.content += this.originalContent.substring(endPos);
    return this.content;
  }

  private writeUncapturedContentInBetween(node: TsNode): void {
    let newContent = this.originalContent
      .substring(node.getFullStart(), node.getStart())
      .trim();
    if (newContent) {
      this.content += newContent + "\n";
    }
  }

  private static getEnd(node: TsNode): number {
    return node.getStart() + node.getWidth();
  }
}
