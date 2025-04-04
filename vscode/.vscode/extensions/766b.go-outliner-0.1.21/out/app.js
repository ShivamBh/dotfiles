"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const vscode = require("vscode");
const symbol_1 = require("./symbol");
const path_1 = require("path");
const provider_1 = require("./provider");
const path = require("path");
const util_1 = require("./util");
const fs = require("fs");
var TerminalName;
(function (TerminalName) {
    TerminalName["Testing"] = "Go Outliner: Test";
    TerminalName["Benchmark"] = "Go Outliner: Benchmarks";
    TerminalName["Channel"] = "Go Outliner: Debug";
})(TerminalName || (TerminalName = {}));
class Terminal {
    constructor() {
        this._terminalChannel = undefined;
        this._disposable = Array();
        this._enableDebugChannel = false;
        this._enableDebugChannel = vscode.workspace.getConfiguration('goOutliner').get('enableDebugChannel', false);
        vscode.workspace.onDidChangeConfiguration(() => {
            this._enableDebugChannel = vscode.workspace.getConfiguration('goOutliner').get('enableDebugChannel', false);
            this.toggleChannel();
        }, undefined, this._disposable);
        this.toggleChannel();
        vscode.window.onDidCloseTerminal(x => {
            switch (x.name) {
                case TerminalName.Testing:
                    this._terminalTesting = undefined;
                    break;
                case TerminalName.Benchmark:
                    this._terminalBenchmarks = undefined;
                    break;
            }
        }, undefined, this._disposable);
    }
    toggleChannel() {
        if (this._enableDebugChannel && !this._terminalChannel) {
            this._terminalChannel = vscode.window.createOutputChannel(TerminalName.Channel);
            return;
        }
        if (!this._enableDebugChannel && this._terminalChannel) {
            this.TerminalChannel.dispose();
        }
    }
    get TerminalChannel() {
        return this._terminalChannel;
    }
    get TerminalTesting() {
        if (!this._terminalTesting) {
            this._terminalTesting = vscode.window.createTerminal(TerminalName.Testing);
        }
        return this._terminalTesting;
    }
    get TerminalBenchmarks() {
        if (!this._terminalBenchmarks) {
            this._terminalBenchmarks = vscode.window.createTerminal(TerminalName.Benchmark);
        }
        return this._terminalBenchmarks;
    }
    TestFunc(name) {
        let opt = (name) ? ` -run ^${name}$` : '';
        this.TerminalTesting.show();
        this.TerminalTesting.sendText(`go test${opt}`);
    }
    BenchmarkFunc(name) {
        let opt = (name) ? `^${name}$` : '.';
        this.TerminalBenchmarks.show();
        this.TerminalBenchmarks.sendText(`go test -bench ${opt}`);
    }
    Channel(msg) {
        if (!this._enableDebugChannel) {
            return;
        }
        let ts = new Date();
        this.TerminalChannel.appendLine(`${ts.toLocaleTimeString()}: ${msg}`);
    }
    ChannelWithInformationMessage(msg) {
        vscode.window.showInformationMessage(msg);
        this.Channel(msg);
    }
    dispose() {
        this._terminalTesting.dispose();
        this._terminalBenchmarks.dispose();
        if (this._terminalChannel) {
            this._terminalChannel.dispose();
        }
        for (let i = 0; i < this._disposable.length; i++) {
            this._disposable[i].dispose();
        }
    }
}
exports.Terminal = Terminal;
class AppExec {
    constructor(ctx) {
        this._onDidChangeMain = new vscode.EventEmitter();
        this.onDidChangeMain = this._onDidChangeMain.event;
        this._onDidChangeTests = new vscode.EventEmitter();
        this.onDidChangeTests = this._onDidChangeTests.event;
        this._onDidChangeBenchmarks = new vscode.EventEmitter();
        this.onDidChangeBenchmarks = this._onDidChangeBenchmarks.event;
        this.terminal = new Terminal();
        this.explorerExtension = undefined;
        this.symbols = Array();
        this.workspaceRoot = '';
        this.binPathCache = new Map();
        this.checkMissingTools();
        this.checkGoOutlinerVersion();
        // Get currect active text editor and use it's file path as root
        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.Reload(activeEditor.document.fileName);
        }
        else {
            this.Reload(vscode.workspace.rootPath);
        }
        // In the event of file save, reload again
        ctx.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
            this.terminal.Channel(`onDidSaveTextDocument: Event`);
            this.Reload();
        }));
        // Handle event when user opens a new file
        ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
            let e = vscode.window.activeTextEditor;
            if (!e) {
                return;
            }
            if (!util_1.fileExists(e.document.fileName)) {
                return;
            }
            this.terminal.Channel(`onDidChangeActiveTextEditor: Event; ${e.document.fileName}`);
            this.Reload(e.document.fileName);
        }));
        // Register Views
        let mainProvider = new provider_1.Provider(provider_1.ProviderType.Main, this.onDidChangeMain);
        // Extended Explorer View
        let extend = vscode.workspace.getConfiguration('goOutliner').get('extendExplorerTab', false);
        this.terminal.Channel(`Extend default Explorer tab with outliner: ${extend}`);
        if (extend) {
            this.explorerExtension = vscode.window.registerTreeDataProvider('outlinerExplorerExtensionView', mainProvider);
            vscode.commands.executeCommand('setContext', `enableExplorerExtension`, extend);
        }
        vscode.workspace.onDidChangeConfiguration(x => {
            extend = vscode.workspace.getConfiguration('goOutliner').get('extendExplorerTab', false);
            vscode.commands.executeCommand('setContext', `enableExplorerExtension`, extend);
            if (extend && !this.explorerExtension) {
                this.explorerExtension = vscode.window.registerTreeDataProvider('outlinerExplorerExtensionView', mainProvider);
            }
        }, undefined, ctx.subscriptions);
        ctx.subscriptions.push(vscode.window.registerTreeDataProvider("outlinerExplorerView", mainProvider));
        ctx.subscriptions.push(vscode.window.registerTreeDataProvider("outlinerTestsView", new provider_1.Provider(provider_1.ProviderType.Tests, this.onDidChangeTests)));
        ctx.subscriptions.push(vscode.window.registerTreeDataProvider("outlinerBenchmarksView", new provider_1.Provider(provider_1.ProviderType.Benchmarks, this.onDidChangeBenchmarks)));
    }
    Reload(filePath) {
        if (filePath) {
            let newWorkingDirectory = filePath;
            if (util_1.fileExists(filePath)) {
                newWorkingDirectory = path_1.dirname(filePath);
            }
            if (this.workspaceRoot !== newWorkingDirectory) {
                this.terminal.Channel(`Changing working directory from ${this.workspaceRoot} to ${newWorkingDirectory}`);
                this.workspaceRoot = newWorkingDirectory;
                this.symbols = Array();
                this.getOutlineForWorkspace();
            }
        }
        else {
            this.getOutlineForWorkspace();
        }
    }
    getOutlineForWorkspace() {
        let bin = this.findToolFromPath("go-outliner");
        if (!bin) {
            return;
        }
        let dir = this.workspaceRoot;
        fs.readdir(dir, (err, files) => {
            if (err) {
                this.terminal.Channel(`Reading directory: ${dir}; Error: ${err};`);
                return;
            }
            for (let i = 0; i < files.length; i++) {
                if (files[i].toLowerCase().endsWith(".go")) {
                    cp.execFile(bin, [`${dir}`], {}, (err, stdout, stderr) => {
                        this.symbols = JSON.parse(stdout).map(symbol_1.Symbol.fromObject);
                        this.symbols.sort((a, b) => a.label.localeCompare(b.label));
                        this.emitSymbols();
                        this.terminal.Channel(`Reading directory: ${dir}; Results: ${this.symbols.length}`);
                    });
                    return;
                }
            }
            this.symbols = Array();
            this.emitSymbols();
            this.terminal.Channel(`Reading directory: ${dir}; Contains no Go files`);
        });
    }
    emitSymbols() {
        this._onDidChangeMain.fire(this.symbols.filter(x => !x.isTestFile));
        this._onDidChangeTests.fire(this.symbols.filter(x => x.isTestFile && x.type === symbol_1.ItemType.Func && x.label.startsWith("Test")));
        this._onDidChangeBenchmarks.fire(this.symbols.filter(x => x.isTestFile && x.type === symbol_1.ItemType.Func && x.label.startsWith("Benchmark")));
    }
    checkMissingTools() {
        let tools = ["go-outliner"];
        tools.forEach(tool => {
            let toolPath = this.findToolFromPath(tool);
            if (toolPath === "") {
                this.terminal.Channel(`Missing: ${tool}`);
                vscode.window.showInformationMessage(`Go Outliner: Missing: ${tool}`, "Install").then(x => {
                    if (x === "Install") {
                        this.installTool(tool);
                    }
                });
            }
        });
    }
    checkGoOutlinerVersion() {
        let bin = this.findToolFromPath("go-outliner");
        if (bin === "") {
            return;
        }
        const minVersion = "Version 0.3.0";
        cp.execFile(bin, ["-version"], {}, (err, stdout, stderr) => {
            if (err || stderr) {
                this.terminal.Channel(`checkGoOutlinerVersion: ${err} ${stderr}`);
            }
            this.terminal.Channel(`Go-Outliner Version Check: Want (min): ${minVersion}; Have: ${stdout}`);
            if (util_1.semVer(stdout, minVersion) === -1) {
                vscode.window.showInformationMessage(`Go Outliner: Update go-outliner package?`, 'Update').then(x => {
                    if (x === "Update") {
                        this.installTool("go-outliner");
                    }
                });
            }
        });
    }
    installTool(name) {
        let bin = this.findToolFromPath("go");
        if (bin === "") {
            this.terminal.Channel("Could not find Go binary");
            vscode.window.showErrorMessage("Go Outliner: Could not find Go binary");
            return;
        }
        let args = [];
        switch (name) {
            case "go-outliner":
                args = ["install", "github.com/766b/go-outliner@latest"];
                break;
            default:
                this.terminal.Channel("Trying to install unknown tool: " + name);
                return;
        }
        cp.execFile(bin, args, {}, (err, stdout, stderr) => {
            this.terminal.Channel(`Executing ${bin} ${args.join(" ")}`);
            if (err || stderr) {
                this.terminal.Channel(`Error: ${stderr}\n${err}`);
                return;
            }
            this.terminal.Channel(`OK: ${stdout}`);
            this.Reload();
        });
    }
    findToolFromPath(tool) {
        let cachedPath = this.binPathCache.get(tool);
        if (cachedPath) {
            return cachedPath;
        }
        let toolFileName = (process.platform === 'win32') ? `${tool}.exe` : tool;
        let paths = [];
        ['GOPATH', 'GOROOT', 'HOME', (process.platform === 'win32' ? 'Path' : 'PATH')].forEach(x => {
            let env = process.env[x];
            if (!env) {
                return;
            }
            if (x === 'HOME') {
                paths.push(path.join(env, "go"));
            }
            else {
                paths.push(...env.split(path.delimiter));
            }
        });
        for (let i = 0; i < paths.length; i++) {
            let dirs = paths[i].split(path.sep);
            let lookUps = [path.join(paths[i], toolFileName)];
            if (dirs[dirs.length - 1].toLowerCase() !== "bin") {
                lookUps.push(path.join(paths[i], 'bin', toolFileName));
            }
            for (let i = 0; i < lookUps.length; i++) {
                const filePath = lookUps[i];
                if (util_1.fileExists(filePath)) {
                    this.terminal.Channel(`Found "${tool}" at ${filePath}`);
                    this.binPathCache.set(tool, filePath);
                    return filePath;
                }
            }
        }
        this.terminal.Channel(`Could not find "${tool}"`);
        return "";
    }
    dispose() {
        if (this.explorerExtension) {
            this.explorerExtension.dispose();
        }
        this.terminal.dispose();
        this._onDidChangeMain.dispose();
        this._onDidChangeTests.dispose();
        this._onDidChangeBenchmarks.dispose();
    }
}
exports.AppExec = AppExec;
//# sourceMappingURL=app.js.map