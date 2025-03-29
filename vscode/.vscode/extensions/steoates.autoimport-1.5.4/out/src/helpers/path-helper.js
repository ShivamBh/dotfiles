"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathHelper = void 0;
const path = require("path");
class PathHelper {
    static normalisePath(relativePath) {
        let removeFileExtenion = (rp) => {
            if (rp) {
                rp = rp.substring(0, rp.lastIndexOf('.'));
            }
            return rp;
        };
        let makeRelativePath = (rp) => {
            let preAppend = './';
            if (!rp.startsWith(preAppend) && !rp.startsWith('../')) {
                rp = preAppend + rp;
            }
            if (/^win/.test(process.platform)) {
                rp = rp.replace(/\\/g, '/');
            }
            return rp;
        };
        relativePath = makeRelativePath(relativePath);
        relativePath = removeFileExtenion(relativePath);
        return relativePath;
    }
    static getRelativePath(a, b) {
        return path.relative(path.dirname(a), b);
    }
}
exports.PathHelper = PathHelper;
//# sourceMappingURL=path-helper.js.map