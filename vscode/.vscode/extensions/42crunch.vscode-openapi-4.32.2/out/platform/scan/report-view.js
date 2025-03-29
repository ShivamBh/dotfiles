"use strict";
/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanReportWebView = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("../../audit/util");
const web_view_1 = require("../../webapps/web-view");
const http_handler_1 = require("../../webapps/http-handler");
const node_path_1 = require("node:path");
const fs_1 = require("../../util/fs");
const node_fs_1 = require("node:fs");
class ScanReportWebView extends web_view_1.WebView {
    constructor(title, extensionPath, cache, configuration, secrets, store, envStore, prefs) {
        super(extensionPath, "scan", title, vscode.ViewColumn.One, "eye");
        this.cache = cache;
        this.configuration = configuration;
        this.secrets = secrets;
        this.store = store;
        this.envStore = envStore;
        this.prefs = prefs;
        this.hostHandlers = {
            sendHttpRequest: ({ id, request, config }) => (0, http_handler_1.executeHttpRequest)(id, request, config),
            sendCurlRequest: async (curl) => {
                return copyCurl(curl);
            },
            savePrefs: async (prefs) => {
                if (this.document) {
                    const uri = this.document.uri.toString();
                    this.prefs[uri] = {
                        ...this.prefs[uri],
                        ...prefs,
                    };
                }
            },
            showEnvWindow: async () => {
                vscode.commands.executeCommand("openapi.showEnvironment");
            },
            showJsonPointer: async (payload) => {
                if (this.document) {
                    let editor = undefined;
                    // check if document is already open
                    for (const visibleEditor of vscode.window.visibleTextEditors) {
                        if (visibleEditor.document.uri.toString() === this.document.uri.toString()) {
                            editor = visibleEditor;
                        }
                    }
                    if (!editor) {
                        editor = await vscode.window.showTextDocument(this.document, vscode.ViewColumn.One);
                    }
                    const root = this.cache.getParsedDocument(editor.document);
                    const lineNo = (0, util_1.getLocationByPointer)(editor.document, root, payload)[0];
                    const textLine = editor.document.lineAt(lineNo);
                    editor.selection = new vscode.Selection(lineNo, 0, lineNo, 0);
                    editor.revealRange(textLine.range, vscode.TextEditorRevealType.AtTop);
                }
            },
        };
        envStore.onEnvironmentDidChange((env) => {
            if (this.isActive()) {
                this.sendRequest({
                    command: "loadEnv",
                    payload: { default: undefined, secrets: undefined, [env.name]: env.environment },
                });
            }
        });
        vscode.window.onDidChangeActiveColorTheme((e) => {
            if (this.isActive()) {
                this.sendColorTheme(e);
            }
        });
    }
    async onStart() {
        await this.sendColorTheme(vscode.window.activeColorTheme);
    }
    async onDispose() {
        this.document = undefined;
        if (this.temporaryReportDirectory !== undefined) {
            await cleanupTempScanDirectory(this.temporaryReportDirectory);
        }
        await super.onDispose();
    }
    async sendStartScan(document) {
        this.document = document;
        await this.show();
        return this.sendRequest({ command: "startScan", payload: undefined });
    }
    setTemporaryReportDirectory(dir) {
        this.temporaryReportDirectory = dir;
    }
    async sendLogMessage(message, level) {
        this.sendRequest({
            command: "showLogMessage",
            payload: { message, level, timestamp: new Date().toISOString() },
        });
    }
    async showGeneralError(error) {
        this.sendRequest({
            command: "showGeneralError",
            payload: error,
        });
    }
    async showScanReport(path, method, report, oas) {
        await this.sendRequest({
            command: "showScanReport",
            // FIXME path and method are ignored by the UI, fix message to make 'em optionals
            payload: {
                path,
                method,
                report: report,
                security: undefined,
                oas,
            },
        });
    }
    async showFullScanReport(report, oas) {
        await this.sendRequest({
            command: "showFullScanReport",
            // FIXME path and method are ignored by the UI, fix message to make 'em optionals
            payload: {
                report: report,
                security: undefined,
                oas,
            },
        });
    }
    async exportReport(destination) {
        const reportUri = vscode.Uri.file((0, node_path_1.join)(this.temporaryReportDirectory, "report.json"));
        vscode.workspace.fs.copy(reportUri, destination, { overwrite: true });
    }
}
exports.ScanReportWebView = ScanReportWebView;
async function copyCurl(curl) {
    vscode.env.clipboard.writeText(curl);
    const disposable = vscode.window.setStatusBarMessage(`Curl command copied to the clipboard`);
    setTimeout(() => disposable.dispose(), 1000);
}
async function cleanupTempScanDirectory(dir) {
    const oasFilename = (0, node_path_1.join)(dir, "openapi.json");
    const scanconfFilename = (0, node_path_1.join)(dir, "scanconf.json");
    const reportFilename = (0, node_path_1.join)(dir, "report.json");
    try {
        if ((0, fs_1.existsSync)(oasFilename)) {
            (0, node_fs_1.unlinkSync)(oasFilename);
        }
        if ((0, fs_1.existsSync)(scanconfFilename)) {
            (0, node_fs_1.unlinkSync)(scanconfFilename);
        }
        if ((0, fs_1.existsSync)(reportFilename)) {
            (0, node_fs_1.unlinkSync)(reportFilename);
        }
        (0, node_fs_1.rmdirSync)(dir);
    }
    catch (ex) {
        // ignore
    }
}
//# sourceMappingURL=report-view.js.map