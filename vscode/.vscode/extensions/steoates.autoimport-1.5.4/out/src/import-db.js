"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportDb = void 0;
const vscode = require("vscode");
class ImportDb {
    static get count() {
        return ImportDb.imports.length;
    }
    static all() {
        return ImportDb.imports;
    }
    static getImport(name, doc) {
        let workspace = vscode.workspace.getWorkspaceFolder(doc);
        let matcher = (i) => i.name === name;
        if (workspace !== undefined) {
            matcher = (i) => i.name === name && i.workspace.name === workspace.name;
        }
        return ImportDb.imports.filter(matcher);
    }
    static delete(request) {
        try {
            let index = ImportDb.imports.findIndex(m => m.file.fsPath === request.file.fsPath);
            if (index !== -1) {
                ImportDb.imports.splice(index, 1);
            }
        }
        catch (error) {
        }
    }
    static saveImport(name, data, file, workspace) {
        name = name.trim();
        if (name === '' || name.length === 1) {
            return;
        }
        let obj = {
            name,
            file,
            workspace
        };
        let exists = ImportDb.imports.findIndex(m => m.name === obj.name && m.file.fsPath === file.fsPath);
        if (exists === -1) {
            ImportDb.imports.push(obj);
        }
    }
}
exports.ImportDb = ImportDb;
ImportDb.imports = new Array();
//# sourceMappingURL=import-db.js.map