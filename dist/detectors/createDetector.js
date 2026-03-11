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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDetector = createDetector;
const StreakDetector_1 = require("./StreakDetector");
const ChecklistDetector_1 = require("./ChecklistDetector");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const detectors = [];
function buildApiItemMatcher(apiConfig) {
    const { url, transform, match, maxItems = 5, timeout = 3000, cacheKey, cachePath = path.resolve(process.cwd(), 'output', 'api_cache.json') } = apiConfig;
    let cache = {};
    try {
        cache = JSON.parse(fs.readFileSync(cachePath, 'utf8') || '{}');
    }
    catch {
        // cache file doesn't exist yet, start empty
    }
    function saveCacheToDisk() {
        try {
            fs.mkdirSync(path.dirname(cachePath), { recursive: true });
            fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
        }
        catch {
            // ignore persist errors
        }
    }
    return async (items, expectedItems) => {
        const covered = new Set();
        const uniqueItems = [...new Set(items)].slice(0, maxItems);
        const results = await Promise.all(uniqueItems.map(async (item) => {
            const key = cacheKey ? cacheKey(item) : item;
            if (cache[key])
                return cache[key];
            if (process.env.FAST_MODE)
                return null;
            try {
                const abortController = new AbortController();
                setTimeout(() => abortController.abort(), timeout);
                const response = await fetch(url(item), { signal: abortController.signal });
                if (!response.ok)
                    return null;
                const data = await response.json();
                const result = transform ? transform(data) : data;
                if (result) {
                    cache[key] = result;
                    saveCacheToDisk();
                }
                return result;
            }
            catch {
                return null;
            }
        }));
        results.filter(Boolean).forEach((result) => {
            expectedItems.forEach((expected) => {
                if (match(result, expected))
                    covered.add(expected.key);
            });
        });
        return {
            covered,
            missing: expectedItems.map((item) => item.key).filter((key) => !covered.has(key))
        };
    };
}
function createChecklistDetector(name, config) {
    const expectedItems = (config.expected || []).map((item) => typeof item === 'string' ? { key: item } : item);
    const compareFn = config.compare || (config.api ? buildApiItemMatcher(config.api) : undefined);
    return new ChecklistDetector_1.ChecklistDetector({
        name,
        dataSource: config.dataSource,
        severity: config.severity || 'info',
        expectedItems,
        extractActual: config.extract || ((entry) => entry.items || []),
        compareFn,
        matchFn: config.match,
        todayOnly: config.todayOnly !== false,
        dateFilter: config.dateFilter,
        aggregate: config.aggregate || false,
        message: config.message || ((missing) => `Missing: ${missing.join(', ')}`)
    });
}
function createStreakDetector(name, type, config) {
    const isBreakType = type === 'streak-break';
    return new StreakDetector_1.StreakDetector({
        name,
        dataSource: config.dataSource,
        minRepeat: config.minRepeat || 3,
        triggerOn: isBreakType ? 'break' : 'ongoing',
        severity: config.severity || (isBreakType ? 'warning' : 'info'),
        message: config.message
    });
}
function createDetector(name, type, config = {}) {
    let detector;
    if (type === 'checklist') {
        detector = createChecklistDetector(name, config);
    }
    else if (type === 'streak-ongoing' || type === 'streak-break') {
        detector = createStreakDetector(name, type, config);
    }
    else {
        throw new Error(`Unknown detector type: ${type}`);
    }
    detectors.push(detector);
    return detector;
}
createDetector.getAll = () => detectors;
createDetector.clear = () => { detectors.length = 0; };
exports.default = createDetector;
//# sourceMappingURL=createDetector.js.map