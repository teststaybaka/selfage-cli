import {
  ImportEqualsDeclaration,
  NamespaceImport,
  NamedImports,
  StringLiteral,
  ImportDeclaration,
  createSourceFile,
  ScriptTarget,
  SyntaxKind,
  ExternalModuleReference,
} from "typescript";

export function sortImports(originalContent: string): string {
  let equalImports: Map<string, string> = new Map();
  let defaultImports: Map<string, string> = new Map();
  let namespaceImports: Map<string, string> = new Map();
  let namedImports: Map<string, Set<string>> = new Map();
  let sideEffectImports: Set<string> = new Set();
  let content = "";

  let sourceFile = createSourceFile(
    "placeholder",
    originalContent,
    ScriptTarget.ES5,
    false
  );
  for (let node of sourceFile.statements) {
    if (node.kind === SyntaxKind.ImportEqualsDeclaration) {
      let importNode = node as ImportEqualsDeclaration;
      equalImports.set(
        importNode.name.text,
        ((importNode.moduleReference as ExternalModuleReference)
          .expression as StringLiteral).text
      );
    } else if (node.kind === SyntaxKind.ImportDeclaration) {
      let importNode = node as ImportDeclaration;
      let importPath = (importNode.moduleSpecifier as StringLiteral).text;
      if (!importNode.importClause) {
        sideEffectImports.add(importPath);
      } else if (!importNode.importClause.namedBindings) {
        defaultImports.set(importPath, importNode.importClause.name.text);
      } else if (
        importNode.importClause.namedBindings.kind ===
        SyntaxKind.NamespaceImport
      ) {
        namespaceImports.set(
          importPath,
          (importNode.importClause.namedBindings as NamespaceImport).name.text
        );
      } else if (
        importNode.importClause.namedBindings.kind === SyntaxKind.NamedImports
      ) {
        if (!namedImports.has(importPath)) {
          namedImports.set(importPath, new Set());
        }
        let names = namedImports.get(importPath);
        for (let specifier of (importNode.importClause
          .namedBindings as NamedImports).elements) {
          if (specifier.propertyName) {
            names.add(
              specifier.propertyName.text + "as " + specifier.name.text
            );
          } else {
            names.add(specifier.name.text);
          }
        }
      }
    }
  }

  for (let [path, name] of equalImports) {
    content += `import ${name} = require('${path}');\n`;
  }
  for (let [path, name] of defaultImports) {
    content += `import ${name} from '${path}';\n`;
  }
  for (let [path, name] of namespaceImports) {
    content += `import * as ${name} from '${path}';\n`;
  }
  for (let [path, names] of namedImports) {
    content += `import { ${[...names].join(",")} } from '${path}';\n`;
  }
  for (let path of sideEffectImports) {
    content += `import '${path}';\n`;
  }
  console.log(content);
  return content;
}
