import { randomUUID } from 'crypto';
import type {
  EventGroup,
  Event,
  Finding,
  FindingData,
  Severity,
  DetectorConfig,
  Detector
} from '../types';

export abstract class BaseDetector implements Detector {
  public readonly name: string;
  public readonly description: string;
  public readonly dataSource: string | null;
  public readonly severity: Severity;
  public isFallback?: boolean;

  constructor(config: DetectorConfig = {}) {
    this.name = config.name || this.constructor.name;
    this.description = config.description || '';
    this.dataSource = config.dataSource || null;
    this.severity = config.severity || 'info';
  }

  abstract detect(entry: EventGroup): Promise<Finding[]>;

  protected getEvents(entry: EventGroup | Event[]): Event[] {
    if (Array.isArray(entry)) return entry;
    return entry?.events ?? [];
  }

  protected parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  isToday(dateValue: string | Date): boolean {
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetStr = typeof dateValue === 'string'
      ? dateValue.slice(0, 10)
      : dateValue.toISOString().slice(0, 10);
    return targetStr === todayStr;
  }

  filterByDate(
    events: Event[],
    targetDate: string | Date,
    unit: 'day' | 'month' | 'year' = 'day'
  ): Event[] {
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) return [];

    const sliceLen = unit === 'day' ? 10 : unit === 'month' ? 7 : 4;
    const matchStr = target.toISOString().slice(0, sliceLen);

    return events.filter((ev) => {
      const dateStr = ev.createdAt || ev.date;
      if (!dateStr) return false;
      if (typeof dateStr === 'string') return dateStr.startsWith(matchStr);
      const parsed = new Date(dateStr as any);
      return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(matchStr);
    });
  }

  protected getTimestamp(e: Event): number | null {
    const raw = e.createdAt ?? e.date;
    if (!raw) return null;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? null : t;
  }

  protected todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  createFinding(findingData: FindingData): Finding {
    const { id, message, evidence = {}, severity, ...extra } = findingData;
    return {
      id: id ?? `${this.name.toLowerCase()}-${randomUUID()}`,
      detector: this.name,
      severity: severity || this.severity,
      message,
      evidence,
      ...extra
    };
  }
}

export default BaseDetector;
