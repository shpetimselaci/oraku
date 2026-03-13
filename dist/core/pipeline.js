"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const EventStitcher_1 = require("./EventStitcher");
const DetectorManager_1 = require("../detectors/DetectorManager");
const notifications_1 = require("../notifications");
async function runPipeline(events, options = {}) {
    const { groupBy = 'meta.userId' } = options;
    const groups = new EventStitcher_1.EventStitcher(events).stitchByField(groupBy);
    const findings = await new DetectorManager_1.DetectorManager().runDetectorsOn(groups);
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
        throw new Error('GROQ_API_KEY not set in oraku-main environment');
    const raw = await (0, notifications_1.generateNotifications)(findings, { apiKey });
    const notifications = raw
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
    return { count: findings.length, findings, notifications };
}
//# sourceMappingURL=pipeline.js.map