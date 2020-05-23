import fs = require('fs');

export interface ImportLine {
  declaration: string,
  path: string,
}

export function sortImports(filePath: string): void {
  let content = fs.readFileSync(filePath).toString();
  let lines = content.split('\n');

  let extractImportRequireRegex = /^import(.*?)=.*?require.*?\(['"](.*?)['"]\).*?/;
  let extractImportFromRegex = /^import.*?{(.*?)}.*?from.*?['"](.*?)['"].*?/;

  let importRequireList: ImportLine[] = [];
  let importFromList: ImportLine[] = [];
  let followingLines: string[] = [];
  for (let line of lines) {
    let importRequireMatched = line.match(extractImportRequireRegex);
    if (importRequireMatched) {
      importRequireList.push({
        declaration: importRequireMatched[1].trim(),
        path: importRequireMatched[2],
      });
      continue;
    }

    let importFromMatched = line.match(extractImportFromRegex);
    if (importFromMatched) {
      let declarations = importFromMatched[1].split(',');
      let declarationsTrimmed: string[] = [];
      for (let declaration of declarations) {
        declarationsTrimmed.push(declaration.trim());
      }

      importFromList.push({
        declaration: declarationsTrimmed.sort().join(', '),
        path: importFromMatched[2],
      });
      continue;
    }

    followingLines.push(line);
  }

  importRequireList.sort((a, b): number => {
    return a.path.localeCompare(b.path);
  });
  importFromList.sort((a, b): number => {
    return a.path.localeCompare(b.path);
  });

  let importLines: string[] = [];
  for (let importLine of importRequireList) {
    importLines.push(`import ${importLine.declaration} = require('${importLine.path}');`);
  }
  for (let imprtLine of importFromList) {
    importLines.push(`import { ${imprtLine.declaration} } from '${imprtLine.path}';`);
  }

  let result = importLines.join('\n') + '\n' + followingLines.join('\n');
  fs.writeFileSync(filePath, result);
}
