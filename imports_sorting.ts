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

export function sortImports(originalContent: string) {
  let sourceFile = createSourceFile(
    "placeholder",
    originalContent,
    ScriptTarget.ES5,
    true
  );

  let equalImports = new Map<string, string>();
  let defaultImports = new Map<string, string>();
  let namespaceImports = new Map<string, string>();
  let namedImports = new Map<string, Set<string>>();
  let sideEffectImports = new Set<string>();
  let contentList = new Array<string>();

  let endPos = 0;
  for (let node of sourceFile.statements) {
    if (node.kind === SyntaxKind.ImportEqualsDeclaration) {
      let importNode = node as ImportEqualsDeclaration;
      equalImports.set(
        ((importNode.moduleReference as ExternalModuleReference)
          .expression as StringLiteral).text,
        importNode.name.text
      );
      writeUncapturedContentInBetween(node, contentList);
      (endPos = getEnd(node)), contentList;
      continue;
    } else if (node.kind === SyntaxKind.ImportDeclaration) {
      let importNode = node as ImportDeclaration;
      let importPath = (importNode.moduleSpecifier as StringLiteral).text;
      if (!importNode.importClause) {
        sideEffectImports.add(importPath);
        writeUncapturedContentInBetween(node, contentList);
        endPos = getEnd(node);
        continue;
      } else if (!importNode.importClause.namedBindings) {
        defaultImports.set(importPath, importNode.importClause.name.text);
        writeUncapturedContentInBetween(node, contentList);
        endPos = getEnd(node);
        continue;
      } else if (
        importNode.importClause.namedBindings.kind ===
        SyntaxKind.NamespaceImport
      ) {
        namespaceImports.set(
          importPath,
          (importNode.importClause.namedBindings as NamespaceImport).name.text
        );
        writeUncapturedContentInBetween(node, contentList);
        endPos = getEnd(node);
        continue;
      } else if (
        importNode.importClause.namedBindings.kind === SyntaxKind.NamedImports
      ) {
        if (!namedImports.has(importPath)) {
          namedImports.set(importPath, new Set());
        }
        let names = namedImports.get(importPath);
        for (let specifier of (importNode.importClause
          .namedBindings as NamedImports).elements) {
          names.add(specifier.getText());
        }
        writeUncapturedContentInBetween(node, contentList);
        endPos = getEnd(node);
        continue;
      }
    }
    break;
  }

  for (let path of [...equalImports.keys()].sort()) {
    let name = equalImports.get(path);
    contentList.push(`import ${name} = require('${path}');\n`);
  }
  for (let path of [...defaultImports.keys()].sort()) {
    let name = defaultImports.get(path);
    contentList.push(`import ${name} from '${path}';\n`);
  }
  for (let path of [...namespaceImports.keys()].sort()) {
    let name = namespaceImports.get(path);
    contentList.push(`import * as ${name} from '${path}';\n`);
  }
  for (let path of [...namedImports.keys()].sort()) {
    let names = namedImports.get(path);
    let sortedNames = [...names].sort();
    contentList.push(`import { ${sortedNames.join(",")} } from '${path}';\n`);
  }
  for (let path of [...sideEffectImports].sort()) {
    contentList.push(`import '${path}';\n`);
  }
  contentList.push(originalContent.substring(endPos));
  return contentList.join("");
}

function getEnd(node: TsNode): number {
  return node.getStart() + node.getWidth();
}

function writeUncapturedContentInBetween(
  node: TsNode,
  contentList: Array<string>
): void {
  let newContent = node
    .getFullText()
    .substring(0, node.getStart() - node.getFullStart())
    .trim();
  if (newContent) {
    contentList.push(newContent + "\n");
  }
}
