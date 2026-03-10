import type { Detector, DetectConfig } from '../types';
/**
 * Declarative detector builder - auto-infers detector type from filter
 *
 * Usage:
 *   detect('curriculum | today | missing(reading, play, art)')
 *   detect({ source: 'nutrition', when: 'today', missing: ['vitamin-a', 'iron'] })
 *   detect({ source: 'routine', repeats: 3 })
 *   detect({ source: 'routine', breaks: 5, severity: 'warning' })
 */
declare function detect(filter: string | DetectConfig): Detector;
declare namespace detect {
    var getAll: () => Detector[];
    var clear: () => void;
}
export default detect;
export { detect };
//# sourceMappingURL=detect.d.ts.map