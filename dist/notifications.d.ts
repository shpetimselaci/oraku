import type { Finding } from './types';
export interface Notification {
    ref: string;
    detector: string;
    type: string;
    message: string;
}
export interface NotificationOptions {
    apiKey: string;
    model?: string;
}
export declare function generateNotifications(findings: Finding[], options: NotificationOptions): Promise<string>;
//# sourceMappingURL=notifications.d.ts.map