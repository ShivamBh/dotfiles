"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportFixer = void 0;
const vscode = require("vscode");
const path = require("path");
class ImportFixer {
    constructor() {
        let config = vscode.workspace.getConfiguration('autoimport');
        this.useSemiColon = config.get('useSemiColon');
        this.spacesBetweenBraces = config.get('spaceBetweenBraces');
        this.doubleQuotes = config.get('doubleQuotes');
    }
    fix(document, range, context, token, imports) {
        let edit = this.getTextEdit(document, imports);
        vscode.workspace.applyEdit(edit);
    }
    getTextEdit(document, imports) {
        let edit = new vscode.WorkspaceEdit();
        let importObj = imports[0].file;
        let importName = imports[0].name;
        let relativePath = this.normaliseRelativePath(importObj, this.getRelativePath(document, importObj));
        if (this.alreadyResolved(document, relativePath, importName)) {
            return edit;
        }
        if (this.shouldMergeImport(document, relativePath)) {
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), this.mergeImports(document, edit, importName, importObj, relativePath));
        }
        else {
            edit.insert(document.uri, new vscode.Position(0, 0), this.createImportStatement(imports[0].name, relativePath, true));
        }
        return edit;
    }
    alreadyResolved(document, relativePath, importName) {
        let exp = new RegExp('(?:import\ \{)(?:.*)(?:\}\ from\ \')(?:' + relativePath + ')(?:\'\;)');
        let currentDoc = document.getText();
        let foundImport = currentDoc.match(exp);
        if (foundImport && foundImport.length > 0 && foundImport[0].indexOf(importName) > -1) {
            return true;
        }
        return false;
    }
    shouldMergeImport(document, relativePath) {
        let currentDoc = document.getText();
        let isCommentLine = (text) => {
            let firstTwoLetters = text.trim().substr(0, 2);
            return firstTwoLetters === '//' || firstTwoLetters === '/*';
        };
        return currentDoc.indexOf(relativePath) !== -1 && !isCommentLine(currentDoc);
    }
    mergeImports(document, edit, name, file, relativePath) {
        let exp = this.useSemiColon === true ?
            new RegExp('(?:import\ \{)(?:.*)(?:\}\ from\ \')(?:' + relativePath + ')(?:\'\;)') :
            new RegExp('(?:import\ \{)(?:.*)(?:\}\ from\ \')(?:' + relativePath + ')(?:\'\)');
        let currentDoc = document.getText();
        let foundImport = currentDoc.match(exp);
        if (foundImport) {
            let workingString = foundImport[0];
            let replaceTarget = this.useSemiColon === true ?
                /{|}|from|import|'|"| |;/gi :
                /{|}|from|import|'|"| |/gi;
            workingString = workingString
                .replace(replaceTarget, '').replace(relativePath, '');
            let importArray = workingString.split(',');
            importArray.push(name);
            let newImport = this.createImportStatement(importArray.join(', '), relativePath);
            currentDoc = currentDoc.replace(exp, newImport);
        }
        return currentDoc;
    }
    createImportStatement(imp, path, endline = false) {
        let formattedPath = path.replace(/\"/g, '')
            .replace(/\'/g, '');
        let returnStr = '';
        if ((this.doubleQuotes) && (this.spacesBetweenBraces)) {
            returnStr = `import { ${imp} } from "${formattedPath}";${endline ? '\r\n' : ''}`;
        }
        else if (this.doubleQuotes) {
            returnStr = `import {${imp}} from "${formattedPath}";${endline ? '\r\n' : ''}`;
        }
        else if (this.spacesBetweenBraces) {
            returnStr = `import { ${imp} } from '${formattedPath}';${endline ? '\r\n' : ''}`;
        }
        else {
            returnStr = `import {${imp}} from '${formattedPath}';${endline ? '\r\n' : ''}`;
        }
        if (this.useSemiColon === false) {
            returnStr = returnStr.replace(';', '');
        }
        return returnStr;
    }
    getRelativePath(document, importObj) {
        return importObj.discovered ? importObj.fsPath :
            path.relative(path.dirname(document.fileName), importObj.fsPath);
    }
    normaliseRelativePath(importObj, relativePath) {
        let removeFileExtenion = (rp) => {
            if (rp) {
                rp = rp.substring(0, rp.lastIndexOf('.'));
            }
            return rp;
        };
        let makeRelativePath = (rp) => {
            let preAppend = './';
            if (!rp.startsWith(preAppend)) {
                rp = preAppend + rp;
            }
            if (/^win/.test(process.platform)) {
                rp = rp.replace(/\\/g, '/');
            }
            return rp;
        };
        if (importObj.discovered === undefined) {
            relativePath = makeRelativePath(relativePath);
            relativePath = removeFileExtenion(relativePath);
        }
        return relativePath;
    }
}
exports.ImportFixer = ImportFixer;
//# sourceMappingURL=import-fixer.js.map