"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeUpload = void 0;
const import_db_1 = require("./import-db");
const FS = require("fs");
const vscode = require("vscode");
const _ = require("lodash");
class NodeUpload {
    constructor(config) {
        this.config = config;
        this.filesToScan = this.config.get('filesToScan');
        this.useAutoImportNet = this.config.get('useAutoImportNet');
    }
    scanNodeModules() {
        this.getMappings().then((mappings) => {
            for (let key in mappings.mappings) {
                let map = mappings.mappings[key];
                if (map) {
                    map.forEach(exp => {
                        import_db_1.ImportDb.saveImport(exp, exp, { fsPath: key, discovered: true }, mappings.workspace);
                    });
                }
            }
        });
    }
    getMappings() {
        return new Promise((resolve) => {
            let mappings = {};
            let mapArrayToLocation = (exports, location) => {
                if (mappings[location]) {
                    mappings[location] = (mappings[location]).concat(exports);
                }
                else {
                    mappings[location] = exports;
                }
            };
            vscode.workspace.workspaceFolders.forEach(workspace => {
                let glob = vscode.workspace.getConfiguration('autoimport').get('filesToScan');
                const relativePattern = new vscode.RelativePattern(workspace, glob);
                vscode.workspace.findFiles(relativePattern, '**/node_modules/**', 99999).then((files) => {
                    files.forEach((f, i) => {
                        FS.readFile(f.fsPath, 'utf8', (err, data) => {
                            if (err) {
                                return console.log(err);
                            }
                            let matches = data.match(/\bimport\s+(?:.+\s+from\s+)?[\'"]([^"\']+)["\']/g);
                            if (matches) {
                                matches.forEach(m => {
                                    if (m.indexOf('./') === -1 && m.indexOf('!') === -1) {
                                        let exports = m.match(/\bimport\s+(?:.+\s+from\s+)/), location = m.match(/[\'"]([^"\']+)["\']/g);
                                        if (exports && location) {
                                            let exportArray = exports[0]
                                                .replace('import', '')
                                                .replace('{', '')
                                                .replace('}', '')
                                                .replace('from', '')
                                                .split(',')
                                                .map(e => {
                                                e = e.replace(/\s/g, '');
                                                return e;
                                            });
                                            mapArrayToLocation(exportArray, location[0].replace("'", '')
                                                .replace("'", ""));
                                        }
                                    }
                                });
                            }
                            if (i == (files.length - 1)) {
                                for (let key in mappings) {
                                    if (mappings.hasOwnProperty(key)) {
                                        mappings[key] = _.uniq(mappings[key]);
                                    }
                                }
                                return resolve({ mappings, workspace });
                            }
                        });
                    });
                });
            });
        });
    }
}
exports.NodeUpload = NodeUpload;
//# sourceMappingURL=node-upload.js.map