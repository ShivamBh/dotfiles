"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportScanner = void 0;
const node_upload_1 = require("./node-upload");
const FS = require("fs");
const vscode = require("vscode");
const import_db_1 = require("./import-db");
const auto_import_1 = require("./auto-import");
class ImportScanner {
    constructor(config) {
        this.config = config;
        this.filesToScan = this.config.get('filesToScan');
        this.showNotifications = this.config.get('showNotifications');
    }
    scan(request) {
        this.showOutput = request.showOutput ? request.showOutput : false;
        if (this.showOutput) {
            this.scanStarted = new Date();
        }
        let scanLocation = this.filesToScan;
        if (request.workspace !== undefined) {
            scanLocation = new vscode.RelativePattern(request.workspace, scanLocation);
        }
        vscode.workspace
            .findFiles(scanLocation, '**/node_modules/**', 99999)
            .then((files) => this.processWorkspaceFiles(files));
        vscode.commands
            .executeCommand('extension.scanNodeModules');
    }
    edit(request) {
        import_db_1.ImportDb.delete(request);
        this.loadFile(request.file, request.workspace, true);
        new node_upload_1.NodeUpload(vscode.workspace.getConfiguration('autoimport')).scanNodeModules();
    }
    delete(request) {
        import_db_1.ImportDb.delete(request);
        auto_import_1.AutoImport.setStatusBar();
    }
    processWorkspaceFiles(files) {
        let pruned = files.filter((f) => {
            return f.fsPath.indexOf('typings') === -1 &&
                f.fsPath.indexOf('node_modules') === -1 &&
                f.fsPath.indexOf('jspm_packages') === -1;
        });
        pruned.forEach((f, i) => {
            let workspace = vscode.workspace.getWorkspaceFolder(f);
            this.loadFile(f, workspace, i === (pruned.length - 1));
        });
    }
    loadFile(file, workspace, last) {
        FS.readFile(file.fsPath, 'utf8', (err, data) => {
            if (err) {
                return console.log(err);
            }
            this.processFile(data, file, workspace);
            if (last) {
                auto_import_1.AutoImport.setStatusBar();
            }
            if (last && this.showOutput && this.showNotifications) {
                this.scanEnded = new Date();
                let str = `[AutoImport] cache creation complete - (${Math.abs(this.scanStarted - this.scanEnded)}ms)`;
                vscode.window
                    .showInformationMessage(str);
            }
        });
    }
    processFile(data, file, workspace) {
        var classMatches = data.match(/(export class) ([a-zA-z])\w+/g), interfaceMatches = data.match(/(export interface) ([a-zA-z])\w+/g), propertyMatches = data.match(/(export let) ([a-zA-z])\w+/g), varMatches = data.match(/(export var) ([a-zA-z])\w+/g), constMatches = data.match(/(export const) ([a-zA-z])\w+/g), enumMatches = data.match(/(export enum) ([a-zA-z])\w+/g), typeMatches = data.match(/(export type) ([a-zA-z])\w+/g);
        if (classMatches) {
            classMatches.forEach(m => {
                let workingFile = m.replace('export', '').replace('class', '');
                import_db_1.ImportDb.saveImport(workingFile, data, file, workspace);
            });
        }
        if (interfaceMatches) {
            interfaceMatches.forEach(m => {
                let workingFile = m.replace('export', '').replace('interface', '');
                import_db_1.ImportDb.saveImport(workingFile, data, file, workspace);
            });
        }
        if (propertyMatches || varMatches || constMatches || enumMatches || typeMatches) {
            [].concat(propertyMatches, varMatches, constMatches, enumMatches, typeMatches).filter(m => m).forEach(m => {
                let workingFile = m.replace('export', '').replace('let', '').replace('var', '').replace('const', '').replace('enum', '').replace('type', '');
                import_db_1.ImportDb.saveImport(workingFile, data, file, workspace);
            });
        }
    }
}
exports.ImportScanner = ImportScanner;
//# sourceMappingURL=import-scanner.js.map