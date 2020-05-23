import { readFileSync } from 'fs';
import { InterfaceDeclaration, Statement, NodeArray, NamedImports, StringLiteral, ImportDeclaration, createSourceFile, ScriptTarget, Node as TsNode, SyntaxKind } from 'typescript';

export class Formatter {
  private static UNSUPPORTED_REASON = 'Unsupported syntax for formatter.';
  private static LINE_LIMIT = 80;
  private static INDENT_STEP = '  ';

  private importNodes: ImportDeclaration[] = [];
  private currentIndent = 0;
  private content = '';
  private line = '';
  private lineNumber = 1;

  public constructor(private fileName: string) {}

  public format(): void {
    let sourceFile = createSourceFile(this.fileName,
      readFileSync(this.fileName).toString(), ScriptTarget.ES5, true);
    this.formatImports(sourceFile.statements);
    this.flushLine();
    this.formatStatements(sourceFile.statements);
    console.log(this.content);
  }

  private appendText(text: string): void {
    this.line += text;
  }

  private flushLine(): void {
    this.content += this.line + '\n';
    this.lineNumber++;
    this.line = Formatter.INDENT_STEP.repeat(this.currentIndent);
  }

  private flushLineIfOverLineLimit(textToBeAppended: string
    , needsToPadSpace = false
  ): void {
    if (needsToPadSpace) {
      if (this.line.length + textToBeAppended.length + 1
        > Formatter.LINE_LIMIT
      ) {
        this.flushLine();
        this.appendText(textToBeAppended);
      } else {
        this.appendText(' ' + textToBeAppended);
      }
    } else {
      if (this.line.length + textToBeAppended.length > Formatter.LINE_LIMIT) {
        this.flushLine();
        this.appendText(textToBeAppended);
      } else {
        this.appendText(textToBeAppended);
      }
    }
  }

  private indentOne(
    visitBlock: () => void
  ): void {
    this.currentIndent++;
    visitBlock();
    this.currentIndent--;
  }

  private formatBracketBlock(textToCloseBracket: string
    , needsToPadSpace: boolean
    , visitBlock: () => void
  ): void {
    let startLineNumber = this.lineNumber;
    this.indentOne(visitBlock);
    let hadNewLine = this.lineNumber - startLineNumber > 0;
    if (hadNewLine) {
      this.flushLine();
      this.appendText(textToCloseBracket);
    } else {
      this.flushLineIfOverLineLimit(textToCloseBracket, needsToPadSpace);
    }
  }

  private warnNode(node: TsNode, reason: string): void {
    console.warn(reason + ` Skipping the following code: ${node.getText()}`);
  }

  private formatImports(statementNodes: NodeArray<Statement>): void {
    for (let node of statementNodes) {
      if (node.kind === SyntaxKind.ImportDeclaration) {
        this.importNodes.push(node as ImportDeclaration);
      } else if (node.kind === SyntaxKind.ImportEqualsDeclaration) {
        this.warnNode(node, `Please use "import {} from '';"`);
      }
    }
    this.importNodes.sort(
      (a, b): number => {
        return (a.moduleSpecifier as StringLiteral).text.localeCompare(
          (b.moduleSpecifier as StringLiteral).text
        );
      }
    );
    for (let importNode of this.importNodes) {
      this.visitImportNode(importNode);
    }
  }

  private visitImportNode(importNode: ImportDeclaration): void {
    if (!importNode.importClause || !importNode.importClause.namedBindings
      || importNode.importClause.namedBindings.kind !== SyntaxKind.NamedImports
    ) {
      this.warnNode(importNode, `Please use "import {} from '';".`);
      return;
    }

    let importNames: string[] = [];
    for (let importSpecifier of
      (importNode.importClause.namedBindings as NamedImports).elements
    ) {
      let name = importSpecifier.name.text;
      if (importSpecifier.propertyName) {
        importNames.push(importSpecifier.propertyName.text + ' as ' + name);
      } else {
        importNames.push(name);
      }
    }
    if (importNames.length === 0) {
      return;
    }
    importNames.sort();

    this.appendText('import {');
    let importPath = (importNode.moduleSpecifier as StringLiteral).text;
    let importFrom = `} from '${importPath}';`;
    this.formatBracketBlock(importFrom, true
      , (): void => {
        let firstName = importNames[0];
        this.flushLineIfOverLineLimit(firstName, true);
        for (let i = 1; i < importNames.length; i++) {
          let importName = importNames[i];
          let text = ', ' + importName;
          this.flushLineIfOverLineLimit(text);;
        }
      }
    );
    this.flushLine();
  }

  private formatStatements(statementNodes: NodeArray<Statement>): void {
    for (let node of statementNodes) {
      if (node.kind === SyntaxKind.InterfaceDeclaration) {
        this.visitInterfaceNode(node as InterfaceDeclaration);
        this.flushLine();
      } else if (node.kind === SyntaxKind.ClassDeclaration) {
      } else if (node.kind === SyntaxKind.VariableStatement) {
      } else if (node.kind === SyntaxKind.FunctionDeclaration) {
      } else if (node.kind === SyntaxKind.ExpressionStatement) {
      } else if (node.kind === SyntaxKind.ForStatement) {
      } else if (node.kind === SyntaxKind.IfStatement) {
      } else if (node.kind === SyntaxKind.ImportDeclaration || node.kind ===
        SyntaxKind.ImportEqualsDeclaration
      ) {
        // Should have been handled by {@code #formatImports}.
      } else {
        this.warnNode(node, Formatter.UNSUPPORTED_REASON);
      }
    }
  }

  private visitInterfaceNode(interfaceNode: InterfaceDeclaration): void {
    let name = interfaceNode.name.text;

    let foundExport = false;
    for (let modifier of interfaceNode.modifiers) {
      if (foundExport) {
        console.warn(`Skipping "${SyntaxKind[modifier.kind]}" of interface ${name}.`);
        continue;
      }
      if (modifier.kind === SyntaxKind.ExportKeyword) {
        foundExport = true;
      }
    }
    if (foundExport) {
      this.appendText('export ');
    }
    this.appendText('interface');
    this.flushLineIfOverLineLimit(name, true);

    if (interfaceNode.typeParameters) {
      this.flushLineIfOverLineLimit('<');
      this.formatBracketBlock('>', false
        , (): void => {
          let hasOne = false;
          for (let typeParameter of interfaceNode.typeParameters) {
            if (!hasOne) {
              this.flushLineIfOverLineLimit(typeParameter.name.text, false);
              hasOne = true;
            } else {
              this.flushLineIfOverLineLimit(', ' + typeParameter.name.text
                , false
              );
            }
            if (typeParameter.constraint) {
              this.flushLineIfOverLineLimit('extends', true);
              // this.flushLineIfOverLineLimit(
              //  typeParameter.constraint.typeName.text, true
           
            }
          }
        }
      );
    }

    if (interfaceNode.heritageClauses) {
      
    }
  }
}

