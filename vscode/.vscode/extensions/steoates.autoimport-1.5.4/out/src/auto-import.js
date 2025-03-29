"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoImport = void 0;
const node_upload_1 = require("./node-upload");
const import_action_1 = require("./import-action");
const import_fixer_1 = require("./import-fixer");
const import_scanner_1 = require("./import-scanner");
const import_db_1 = require("./import-db");
const import_completion_1 = require("./import-completion");
const vscode = require("vscode");
class AutoImport {
    constructor(context) {
        this.context = context;
    }
    start() {
        let folder = vscode.workspace.rootPath;
        if (folder === undefined) {
            return false;
        }
        return true;
    }
    attachCommands() {
        let codeActionFixer = vscode.languages.registerCodeActionsProvider('typescript', new import_action_1.ImportAction());
        let importScanner = vscode.commands.registerCommand('extension.importScan', (request) => {
            let scanner = new import_scanner_1.ImportScanner(vscode.workspace.getConfiguration('autoimport'));
            if (request.showOutput) {
                scanner.scan(request);
            }
            else if (request.edit) {
                scanner.edit(request);
            }
            else if (request.delete) {
                scanner.delete(request);
            }
        });
        let nodeScanner = vscode.commands.registerCommand('extension.scanNodeModules', () => {
            new node_upload_1.NodeUpload(vscode.workspace.getConfiguration('autoimport')).scanNodeModules();
        });
        let importFixer = vscode.commands.registerCommand('extension.fixImport', (d, r, c, t, i) => {
            new import_fixer_1.ImportFixer().fix(d, r, c, t, i);
        });
        let completetion = vscode.languages.registerCompletionItemProvider('typescript', new import_completion_1.ImportCompletion(this.context, vscode.workspace.getConfiguration('autoimport').get('autoComplete')), '');
        AutoImport.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        AutoImport.statusBar.text = '{..} : Scanning.. ';
        AutoImport.statusBar.show();
        this.context.subscriptions.push(importScanner, importFixer, nodeScanner, codeActionFixer, AutoImport.statusBar, completetion);
    }
    attachFileWatcher() {
        var multiWorkspace = vscode.workspace.workspaceFolders.length > 0;
        if (multiWorkspace === true) {
            vscode.workspace.workspaceFolders.forEach(workspace => {
                let glob = vscode.workspace.getConfiguration('autoimport').get('filesToScan');
                const relativePattern = new vscode.RelativePattern(workspace, glob);
                let watcher = vscode.workspace.createFileSystemWatcher(relativePattern);
                watcher.onDidChange((file) => {
                    vscode.commands
                        .executeCommand('extension.importScan', { workspace, file, edit: true });
                });
                watcher.onDidCreate((file) => {
                    vscode.commands
                        .executeCommand('extension.importScan', { workspace, file, edit: true });
                });
                watcher.onDidDelete((file) => {
                    vscode.commands
                        .executeCommand('extension.importScan', { workspace, file, delete: true });
                });
            });
        }
        else {
            let glob = vscode.workspace.getConfiguration('autoimport').get('filesToScan');
            let watcher = vscode.workspace.createFileSystemWatcher(glob);
            let workspace = undefined;
            watcher.onDidChange((file) => {
                vscode.commands
                    .executeCommand('extension.importScan', { workspace, file, edit: true });
            });
            watcher.onDidCreate((file) => {
                vscode.commands
                    .executeCommand('extension.importScan', { workspace, file, edit: true });
            });
            watcher.onDidDelete((file) => {
                vscode.commands
                    .executeCommand('extension.importScan', { workspace, file, delete: true });
            });
        }
    }
    scanIfRequired() {
        let settings = this.context.workspaceState.get('auto-import-settings');
        let firstRun = (settings === undefined || settings.firstRun);
        if (vscode.workspace.getConfiguration('autoimport').get('showNotifications')) {
            vscode.window
                .showInformationMessage('[AutoImport] Building cache');
        }
        var multiWorkspace = vscode.workspace.workspaceFolders.length > 0;
        if (multiWorkspace === true) {
            vscode.workspace.workspaceFolders.forEach(workspace => {
                vscode.commands
                    .executeCommand('extension.importScan', { workspace, showOutput: true });
            });
        }
        else {
            vscode.commands
                .executeCommand('extension.importScan', { showOutput: true });
        }
        settings.firstRun = true;
        this.context.workspaceState.update('auto-import-settings', settings);
    }
    static setStatusBar() {
        AutoImport.statusBar.text = `{..} : ${import_db_1.ImportDb.count}`;
    }
}
exports.AutoImport = AutoImport;
//# sourceMappingURL=auto-import.js.map