"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadJsonRecords = loadJsonRecords;
exports.loadJsonRecordsSync = loadJsonRecordsSync;
exports.stitchAndSave = stitchAndSave;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const EventStitcher_1 = require("../core/EventStitcher");
function parseJsonOrNdjson(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
            return parsed;
    }
    catch (_e) { }
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out = [];
    for (const l of lines) {
        try {
            out.push(JSON.parse(l));
        }
        catch (_e) { }
    }
    return out;
}
async function loadJsonRecords(filePath) {
    const abs = path_1.default.resolve(filePath);
    const raw = await fs_1.default.promises.readFile(abs, 'utf8');
    return parseJsonOrNdjson(raw);
}
function loadJsonRecordsSync(filePath) {
    const abs = path_1.default.resolve(filePath);
    const raw = fs_1.default.readFileSync(abs, 'utf8');
    return parseJsonOrNdjson(raw);
}
async function stitchAndSave(options) {
    const { filePath, groupBy = 'externalRef', outJson = 'output/stitched.json', outMd = 'output/stitched.md' } = options;
    const records = await loadJsonRecords(filePath);
    const stitcher = new EventStitcher_1.EventStitcher(records);
    const stitched = stitcher.stitchByField(groupBy);
    fs_1.default.mkdirSync(path_1.default.dirname(path_1.default.resolve(outJson)), { recursive: true });
    fs_1.default.writeFileSync(path_1.default.resolve(outJson), JSON.stringify(stitched, null, 2));
    const keys = Object.keys(stitched).slice(0, 20);
    const mdBlocks = keys.map(k => stitcher.toMarkdown(stitched[k]));
    fs_1.default.writeFileSync(path_1.default.resolve(outMd), mdBlocks.join('\n\n---\n\n'));
    return { countGroups: Object.keys(stitched).length, countRecords: records.length };
}
if (require.main === module) {
    ;
    (async () => {
        const argv = process.argv.slice(2);
        const file = argv[0];
        if (!file) {
            console.error('Usage: node src/ingest/index.ts <file> [--groupBy=meta.userId] [--outJson=...] [--outMd=...]');
            process.exit(1);
        }
        const opts = {};
        for (const a of argv.slice(1)) {
            if (a.startsWith('--groupBy='))
                opts.groupBy = a.split('=')[1];
            if (a.startsWith('--outJson='))
                opts.outJson = a.split('=')[1];
            if (a.startsWith('--outMd='))
                opts.outMd = a.split('=')[1];
        }
        try {
            const res = await stitchAndSave({ filePath: file, ...opts });
            console.log('stitched', res);
        }
        catch (e) {
            console.error('error:', e);
            process.exit(1);
        }
    })();
}
//# sourceMappingURL=index.js.map