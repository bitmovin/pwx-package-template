import * as fs from 'fs';
import * as path from 'path';
import type { EntryObject } from 'webpack';

export function getPackages(rootFolderPath: string) {
  const packages: EntryObject = {};
  extractPackages(rootFolderPath, rootFolderPath, packages);

  return packages;
}

function extractPackages(folderPath: string, root: string, packages: EntryObject) {
  const filePaths = fs.readdirSync(folderPath);

  for (const file of filePaths) {
    const filePath = path.join(folderPath, file);
    const fileStats = fs.statSync(filePath);

    if (fileStats.isDirectory()) {
      extractPackages(filePath, root, packages);
    } else if (isPackageFile(filePath)) {
      const fileName = filePath.split(path.sep).pop().replace('.package.ts', '');

      packages[pascalCaseToKebabCase(fileName)] = { import: filePath };
    }
  }
}

function isPackageFile(filePath: string) {
  return filePath.endsWith('.package.ts');
}

function pascalCaseToKebabCase(camelCase: string): string {
  let snakeCase = '';

  for (const char of camelCase) {
    const lowerCaseChar = char.toLowerCase();
    const prefix = char !== lowerCaseChar ? '-' : '';

    snakeCase = snakeCase + prefix + lowerCaseChar;
  }

  return snakeCase.indexOf('-') === 0 ? snakeCase.substring(1) : snakeCase;
}
