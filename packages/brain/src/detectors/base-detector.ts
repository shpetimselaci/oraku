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
  public readonly scheduleAt?: string;
  public timeWindow: number = 30;
  constructor(config: DetectorConfig = {}) {
    this.name = config.name || this.constructor.name;
    this.description = config.description || '';
    this.notificationType = config.notificationType || 'insight';
    this.scheduleAt = config.scheduleAt;
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

  createFinding(findingData: FindingData): Finding {
    const { id, message, evidence = {}, notificationType, ...extra } = findingData;
    const type = notificationType || this.notificationType;
    return {
      id: id ?? `${this.name.toLowerCase()}-${randomUUID()}`,
      detector: this.name,
      notificationType: type,
      message,
      evidence: this.scheduleAt ? { ...evidence, scheduleAt: this.scheduleAt } : evidence,
      ...extra
    };
  }
}

export default BaseDetector;
