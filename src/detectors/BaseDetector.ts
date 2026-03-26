import { randomUUID } from 'crypto';
import type {
  EventGroup,
  Event,
  Finding,
  FindingData,
  NotificationType,
  DetectorConfig,
  Detector
} from '../types';

export abstract class BaseDetector implements Detector {
  public readonly name: string;
  public readonly description: string;
  public readonly notificationType: NotificationType;
  public isFallback?: boolean;

  constructor(config: DetectorConfig = {}) {
    this.name = config.name || this.constructor.name;
    this.description = config.description || '';
    this.notificationType = config.notificationType || 'insight';
  }

  abstract detect(entry: EventGroup): Promise<Finding[]>;

  protected getEvents(entry: EventGroup | Event[]): Event[] {
    if (Array.isArray(entry)) return entry;
    return entry?.events ?? [];
  }

  protected getString(event: Event, fieldName: string): string | undefined {
    const fieldValue = event[fieldName];
    return typeof fieldValue === 'string' ? fieldValue : undefined;
  }

  protected getNestedString(event: Event, objectFieldName: string, nestedFieldName: string): string | undefined {
    const container = event[objectFieldName];
    if (!container || typeof container !== 'object') return undefined;
    const nestedValue = (container as Record<string, unknown>)[nestedFieldName];
    return typeof nestedValue === 'string' ? nestedValue : undefined;
  }

  protected getEventLabel(event: Event): string | undefined {
    return this.getString(event, 'name') ?? this.getString(event, 'log') ?? this.getString(event, 'title');
  }

  protected getEventCategory(event: Event): string | undefined {
    return this.getString(event, 'subcategory') ?? this.getString(event, 'category');
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
      const d = this.parseDate(ev.createdAt)
      return d ? d.toISOString().startsWith(matchStr) : false
    });
  }

  protected getTimestamp(e: Event): number | null {
    const t = new Date(e.createdAt).getTime();
    return Number.isNaN(t) ? null : t;
  }

  protected todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  createFinding(findingData: FindingData): Finding {
    const { id, message, evidence = {}, notificationType, ...extra } = findingData;
    return {
      id: id ?? `${this.name.toLowerCase()}-${randomUUID()}`,
      detector: this.name,
      notificationType: notificationType || this.notificationType,
      message,
      evidence,
      ...extra
    };
  }
}

export default BaseDetector;
