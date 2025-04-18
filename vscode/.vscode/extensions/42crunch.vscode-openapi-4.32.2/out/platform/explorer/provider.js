"use strict";
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
exports.CollectionsProvider = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("../util");
const root_1 = require("./nodes/root");
class CollectionsProvider {
    constructor(store, favoritesStore, extensionUri) {
        this.store = store;
        this.extensionUri = extensionUri;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.root = new root_1.RootNode(store, favoritesStore);
    }
    getParent(element) {
        return element?.parent;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(node) {
        const item = node.item;
        if (item) {
            item.id = node.id;
            item.contextValue = node.contextValue;
            if (node.icon) {
                item.iconPath = (0, util_1.makeIcon)(this.extensionUri, node.icon);
            }
        }
        return item;
    }
    async getChildren(node) {
        if (node) {
            return node.getChildren();
        }
        return this.root.getChildren();
    }
}
exports.CollectionsProvider = CollectionsProvider;
//# sourceMappingURL=provider.js.map