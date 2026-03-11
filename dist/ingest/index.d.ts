import type { Event } from '../types';
declare function loadJsonRecords(filePath: string): Promise<Event[]>;
declare function loadJsonRecordsSync(filePath: string): Event[];
interface StitchAndSaveOptions {
    filePath: string;
    groupBy?: string | string[];
    outJson?: string;
    outMd?: string;
}
interface StitchAndSaveResult {
    countGroups: number;
    countRecords: number;
}
declare function stitchAndSave(options: StitchAndSaveOptions): Promise<StitchAndSaveResult>;
export { loadJsonRecords, loadJsonRecordsSync, stitchAndSave };
export type { StitchAndSaveOptions, StitchAndSaveResult };
//# sourceMappingURL=index.d.ts.map