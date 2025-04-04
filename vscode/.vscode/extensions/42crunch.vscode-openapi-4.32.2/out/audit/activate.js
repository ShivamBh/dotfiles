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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const commands_1 = require("./commands");
const quickfix_1 = require("./quickfix");
const decoration_1 = require("./decoration");
const lens_1 = require("./lens");
const util_1 = require("./util");
function activate(context, auditContext, cache, configuration, signUpWebView, reportWebView, store) {
    let disposables = [];
    const pendingAudits = {};
    function update(editor) {
        if (editor) {
            (0, decoration_1.setDecorations)(editor, auditContext);
            const uri = editor.document.uri.toString();
            if (auditContext.auditsByMainDocument[uri]) {
                reportWebView.showIfVisible(auditContext.auditsByMainDocument[uri]);
            }
            else {
                let subdocument = false;
                for (const audit of Object.values(auditContext.auditsByMainDocument)) {
                    if (audit.summary.subdocumentUris.includes(uri)) {
                        subdocument = true;
                    }
                }
                // display no report only if the current document is not a
                // part of any multi-document run
                if (!subdocument) {
                    reportWebView.showNoReport();
                }
            }
        }
    }
    const selectors = [
        { scheme: "file", language: "json" },
        { scheme: "file", language: "jsonc" },
        { scheme: "file", language: "yaml" },
    ];
    const auditCodelensProvider = new lens_1.AuditCodelensProvider(cache);
    function activateLens(enabled) {
        disposables.forEach((disposable) => disposable.dispose());
        if (enabled) {
            disposables.push(vscode.languages.registerCodeLensProvider(selectors, auditCodelensProvider));
        }
        else {
            disposables = [];
        }
    }
    configuration.onDidChange(async (e) => {
        if (configuration.changed(e, "codeLens")) {
            activateLens(configuration.get("codeLens"));
        }
    });
    activateLens(configuration.get("codeLens"));
    vscode.window.onDidChangeActiveTextEditor((editor) => update(editor));
    (0, commands_1.registerSecurityAudit)(context, cache, auditContext, pendingAudits, reportWebView, store, signUpWebView);
    (0, commands_1.registerSingleOperationAudit)(context, cache, auditContext, pendingAudits, reportWebView, store, signUpWebView);
    (0, commands_1.registerOutlineSingleOperationAudit)(context, cache, auditContext, pendingAudits, reportWebView, store, signUpWebView);
    (0, commands_1.registerFocusSecurityAudit)(context, cache, auditContext, reportWebView);
    (0, commands_1.registerFocusSecurityAuditById)(context, auditContext, reportWebView);
    (0, quickfix_1.registerQuickfixes)(context, cache, auditContext, store, reportWebView);
    (0, commands_1.registerExportAuditReport)(context, auditContext);
    return new vscode.Disposable(() => disposables.forEach((disposable) => disposable.dispose()));
}
async function deactivate(auditContext) {
    await (0, util_1.clearAuditReportTempDirectories)(auditContext);
}
//# sourceMappingURL=activate.js.map