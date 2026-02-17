import { faker } from "@faker-js/faker";
import * as fs from "fs";
import * as path from "path";

// ============================================
// CATEGORY -> SUBCATEGORY MAPPING (EXPANDED)
// ============================================
const categoryMap: Record<string, string[]> = {
  // Authentication & Security
  authentication: [
    "login",
    "logout",
    "password_reset",
    "password_changed",
    "mfa_enabled",
    "mfa_disabled",
    "session_expired",
    "token_refreshed",
    "sso_login",
    "failed_login",
  ],
  // User Management
  user: [
    "created",
    "updated",
    "deleted",
    "suspended",
    "activated",
    "role_changed",
    "permissions_updated",
    "profile_viewed",
    "avatar_changed",
    "preferences_updated",
  ],
  // Billing & Payments
  billing: [
    "invoice_created",
    "invoice_sent",
    "payment_success",
    "payment_failed",
    "payment_refunded",
    "subscription_started",
    "subscription_changed",
    "subscription_cancelled",
    "trial_started",
    "trial_ended",
  ],
  // Documents & Files
  document: [
    "uploaded",
    "downloaded",
    "shared",
    "deleted",
    "viewed",
    "edited",
    "renamed",
    "moved",
    "copied",
    "permission_changed",
  ],
  // System Events
  system: [
    "maintenance_started",
    "maintenance_completed",
    "upgrade",
    "downgrade",
    "error",
    "warning",
    "config_changed",
    "backup_created",
    "backup_restored",
    "service_restarted",
  ],
  // API & Integrations
  api: [
    "key_created",
    "key_revoked",
    "rate_limited",
    "webhook_triggered",
    "webhook_failed",
    "integration_connected",
    "integration_disconnected",
    "request_failed",
    "request_success",
    "schema_changed",
  ],
  // Communication
  communication: [
    "email_sent",
    "email_opened",
    "email_bounced",
    "sms_sent",
    "notification_sent",
    "notification_read",
    "message_sent",
    "message_received",
    "call_started",
    "call_ended",
  ],
  // Data & Analytics
  data: [
    "export_started",
    "export_completed",
    "import_started",
    "import_completed",
    "report_generated",
    "query_executed",
    "dashboard_viewed",
    "alert_triggered",
    "anomaly_detected",
    "threshold_exceeded",
  ],
  // Compliance & Audit
  compliance: [
    "consent_given",
    "consent_revoked",
    "data_request",
    "data_deletion",
    "policy_accepted",
    "audit_started",
    "audit_completed",
    "access_reviewed",
    "violation_detected",
    "remediation_applied",
  ],
  // Workflow & Tasks
  workflow: [
    "task_created",
    "task_assigned",
    "task_completed",
    "task_cancelled",
    "approval_requested",
    "approval_granted",
    "approval_denied",
    "workflow_started",
    "workflow_completed",
    "deadline_missed",
  ],
};

const categories = Object.keys(categoryMap);

// ============================================
// LOG MESSAGE TEMPLATES
// ============================================
const logTemplates: Record<string, (subcategory: string, username: string, context: LogContext) => string> = {
  authentication: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      login: `User ${user} logged in successfully from ${ctx.ip}`,
      logout: `User ${user} logged out`,
      password_reset: `Password reset requested for ${user}`,
      password_changed: `Password changed for ${user}`,
      mfa_enabled: `MFA enabled for ${user} using ${ctx.mfaMethod}`,
      mfa_disabled: `MFA disabled for ${user}`,
      session_expired: `Session expired for ${user}`,
      token_refreshed: `Access token refreshed for ${user}`,
      sso_login: `User ${user} logged in via SSO (${ctx.ssoProvider})`,
      failed_login: `Failed login attempt for ${user} from ${ctx.ip}`,
    };
    return messages[sub] || `Authentication event for ${user}`;
  },
  user: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      created: `User account ${user} was created by ${ctx.adminUser}`,
      updated: `User ${user} profile was updated`,
      deleted: `User ${user} was deleted by ${ctx.adminUser}`,
      suspended: `User ${user} was suspended. Reason: ${ctx.reason}`,
      activated: `User ${user} was activated`,
      role_changed: `User ${user} role changed from ${ctx.oldRole} to ${ctx.newRole}`,
      permissions_updated: `Permissions updated for ${user}`,
      profile_viewed: `Profile of ${user} was viewed`,
      avatar_changed: `User ${user} changed their avatar`,
      preferences_updated: `User ${user} updated preferences`,
    };
    return messages[sub] || `User event for ${user}`;
  },
  billing: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      invoice_created: `Invoice #${ctx.invoiceId} generated for ${user} - ${ctx.currency}${ctx.amount}`,
      invoice_sent: `Invoice #${ctx.invoiceId} sent to ${user}`,
      payment_success: `Payment of ${ctx.currency}${ctx.amount} processed for ${user}`,
      payment_failed: `Payment failed for ${user}. Reason: ${ctx.failureReason}`,
      payment_refunded: `Refund of ${ctx.currency}${ctx.amount} issued to ${user}`,
      subscription_started: `${user} started ${ctx.planName} subscription`,
      subscription_changed: `${user} changed subscription from ${ctx.oldPlan} to ${ctx.newPlan}`,
      subscription_cancelled: `${user} cancelled ${ctx.planName} subscription`,
      trial_started: `${user} started ${ctx.trialDays}-day trial`,
      trial_ended: `Trial ended for ${user}`,
    };
    return messages[sub] || `Billing event for ${user}`;
  },
  document: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      uploaded: `${user} uploaded ${ctx.fileName} (${ctx.fileSize})`,
      downloaded: `${user} downloaded ${ctx.fileName}`,
      shared: `${user} shared ${ctx.fileName} with ${ctx.sharedWith}`,
      deleted: `${user} deleted ${ctx.fileName}`,
      viewed: `${user} viewed ${ctx.fileName}`,
      edited: `${user} edited ${ctx.fileName}`,
      renamed: `${user} renamed ${ctx.oldFileName} to ${ctx.fileName}`,
      moved: `${user} moved ${ctx.fileName} to ${ctx.destination}`,
      copied: `${user} copied ${ctx.fileName} to ${ctx.destination}`,
      permission_changed: `${user} changed permissions on ${ctx.fileName}`,
    };
    return messages[sub] || `Document event by ${user}`;
  },
  system: (sub, _user, ctx) => {
    const messages: Record<string, string> = {
      maintenance_started: `Scheduled maintenance started. ETA: ${ctx.duration}`,
      maintenance_completed: `Scheduled maintenance completed`,
      upgrade: `System upgraded to version ${ctx.version}`,
      downgrade: `System downgraded to version ${ctx.version}`,
      error: `System error: ${ctx.errorMessage} (Code: ${ctx.errorCode})`,
      warning: `Warning: ${ctx.warningMessage}`,
      config_changed: `Configuration updated: ${ctx.configKey}`,
      backup_created: `Backup created: ${ctx.backupId} (${ctx.backupSize})`,
      backup_restored: `Backup ${ctx.backupId} restored`,
      service_restarted: `Service ${ctx.serviceName} restarted`,
    };
    return messages[sub] || `System event`;
  },
  api: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      key_created: `API key created for ${user}: ${ctx.keyPrefix}...`,
      key_revoked: `API key revoked for ${user}: ${ctx.keyPrefix}...`,
      rate_limited: `Rate limit exceeded for ${user}. Limit: ${ctx.rateLimit}/min`,
      webhook_triggered: `Webhook triggered: ${ctx.webhookUrl}`,
      webhook_failed: `Webhook failed: ${ctx.webhookUrl}. Status: ${ctx.statusCode}`,
      integration_connected: `${user} connected ${ctx.integrationName}`,
      integration_disconnected: `${user} disconnected ${ctx.integrationName}`,
      request_failed: `API request failed: ${ctx.endpoint} (${ctx.statusCode})`,
      request_success: `API request successful: ${ctx.endpoint}`,
      schema_changed: `API schema updated to version ${ctx.schemaVersion}`,
    };
    return messages[sub] || `API event for ${user}`;
  },
  communication: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      email_sent: `Email sent to ${ctx.recipient}: "${ctx.emailSubject}"`,
      email_opened: `Email opened by ${ctx.recipient}: "${ctx.emailSubject}"`,
      email_bounced: `Email bounced for ${ctx.recipient}: ${ctx.bounceReason}`,
      sms_sent: `SMS sent to ${ctx.phoneNumber}`,
      notification_sent: `Notification sent to ${user}: ${ctx.notificationType}`,
      notification_read: `Notification read by ${user}`,
      message_sent: `${user} sent message to ${ctx.recipient}`,
      message_received: `${user} received message from ${ctx.sender}`,
      call_started: `Call started between ${user} and ${ctx.recipient}`,
      call_ended: `Call ended. Duration: ${ctx.callDuration}`,
    };
    return messages[sub] || `Communication event for ${user}`;
  },
  data: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      export_started: `${user} started export: ${ctx.exportType}`,
      export_completed: `Export completed for ${user}: ${ctx.exportType} (${ctx.recordCount} records)`,
      import_started: `${user} started import: ${ctx.importType}`,
      import_completed: `Import completed: ${ctx.recordCount} records processed`,
      report_generated: `${user} generated report: ${ctx.reportName}`,
      query_executed: `Query executed by ${user}. Duration: ${ctx.queryDuration}ms`,
      dashboard_viewed: `${user} viewed dashboard: ${ctx.dashboardName}`,
      alert_triggered: `Alert triggered: ${ctx.alertName}`,
      anomaly_detected: `Anomaly detected in ${ctx.metricName}: ${ctx.anomalyValue}`,
      threshold_exceeded: `Threshold exceeded: ${ctx.metricName} = ${ctx.metricValue} (limit: ${ctx.threshold})`,
    };
    return messages[sub] || `Data event for ${user}`;
  },
  compliance: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      consent_given: `${user} gave consent for ${ctx.consentType}`,
      consent_revoked: `${user} revoked consent for ${ctx.consentType}`,
      data_request: `Data access request submitted by ${user}`,
      data_deletion: `Data deletion completed for ${user}`,
      policy_accepted: `${user} accepted ${ctx.policyName} v${ctx.policyVersion}`,
      audit_started: `Audit started: ${ctx.auditType}`,
      audit_completed: `Audit completed: ${ctx.auditType}. Findings: ${ctx.findingsCount}`,
      access_reviewed: `Access review completed for ${ctx.resourceName}`,
      violation_detected: `Compliance violation detected: ${ctx.violationType}`,
      remediation_applied: `Remediation applied for ${ctx.violationType}`,
    };
    return messages[sub] || `Compliance event for ${user}`;
  },
  workflow: (sub, user, ctx) => {
    const messages: Record<string, string> = {
      task_created: `Task created by ${user}: ${ctx.taskName}`,
      task_assigned: `Task "${ctx.taskName}" assigned to ${ctx.assignee}`,
      task_completed: `Task "${ctx.taskName}" completed by ${user}`,
      task_cancelled: `Task "${ctx.taskName}" cancelled by ${user}`,
      approval_requested: `${user} requested approval for ${ctx.approvalType}`,
      approval_granted: `Approval granted by ${ctx.approver} for ${ctx.approvalType}`,
      approval_denied: `Approval denied by ${ctx.approver}. Reason: ${ctx.reason}`,
      workflow_started: `Workflow started: ${ctx.workflowName}`,
      workflow_completed: `Workflow completed: ${ctx.workflowName}`,
      deadline_missed: `Deadline missed for task: ${ctx.taskName}`,
    };
    return messages[sub] || `Workflow event for ${user}`;
  },
};

// ============================================
// INTERFACES
// ============================================
interface LogContext {
  ip: string;
  mfaMethod: string;
  ssoProvider: string;
  adminUser: string;
  reason: string;
  oldRole: string;
  newRole: string;
  invoiceId: string;
  currency: string;
  amount: string;
  failureReason: string;
  planName: string;
  oldPlan: string;
  newPlan: string;
  trialDays: number;
  fileName: string;
  oldFileName: string;
  fileSize: string;
  sharedWith: string;
  destination: string;
  duration: string;
  version: string;
  errorMessage: string;
  errorCode: string;
  warningMessage: string;
  configKey: string;
  backupId: string;
  backupSize: string;
  serviceName: string;
  keyPrefix: string;
  rateLimit: number;
  webhookUrl: string;
  statusCode: number;
  integrationName: string;
  endpoint: string;
  schemaVersion: string;
  recipient: string;
  emailSubject: string;
  bounceReason: string;
  phoneNumber: string;
  notificationType: string;
  sender: string;
  callDuration: string;
  exportType: string;
  importType: string;
  recordCount: number;
  reportName: string;
  queryDuration: number;
  dashboardName: string;
  alertName: string;
  metricName: string;
  anomalyValue: string;
  metricValue: string;
  threshold: string;
  consentType: string;
  policyName: string;
  policyVersion: string;
  auditType: string;
  findingsCount: number;
  resourceName: string;
  violationType: string;
  taskName: string;
  assignee: string;
  approvalType: string;
  approver: string;
  workflowName: string;
}

interface MetaData {
  username: string;
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  sessionId: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  country: string;
  city: string;
  timezone: string;
  organizationId: string;
  organizationName: string;
  role: string;
  permissions: string[];
  requestId: string;
  traceId: string;
  spanId: string;
  environment: "production" | "staging" | "development";
  version: string;
  feature_flags: Record<string, boolean>;
}

interface ActivityEvent {
  externalRef: string;
  category: string;
  subcategory: string;
  log: string;
  meta: MetaData;
  createdAt: Date;
}

// ============================================
// GENERATORS
// ============================================
function generateLogContext(): LogContext {
  return {
    ip: faker.internet.ip(),
    mfaMethod: faker.helpers.arrayElement(["authenticator", "sms", "email", "hardware_key"]),
    ssoProvider: faker.helpers.arrayElement(["google", "okta", "azure_ad", "auth0"]),
    adminUser: faker.internet.username().toLowerCase(),
    reason: faker.helpers.arrayElement(["policy_violation", "user_request", "security_concern", "inactivity"]),
    oldRole: faker.helpers.arrayElement(["viewer", "editor", "admin"]),
    newRole: faker.helpers.arrayElement(["viewer", "editor", "admin", "super_admin"]),
    invoiceId: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
    currency: faker.helpers.arrayElement(["$", "€", "£"]),
    amount: faker.commerce.price({ min: 10, max: 5000 }),
    failureReason: faker.helpers.arrayElement(["insufficient_funds", "card_declined", "expired_card", "fraud_detected"]),
    planName: faker.helpers.arrayElement(["starter", "professional", "enterprise", "unlimited"]),
    oldPlan: faker.helpers.arrayElement(["starter", "professional"]),
    newPlan: faker.helpers.arrayElement(["professional", "enterprise", "unlimited"]),
    trialDays: faker.helpers.arrayElement([7, 14, 30]),
    fileName: faker.system.fileName(),
    oldFileName: faker.system.fileName(),
    fileSize: `${faker.number.int({ min: 1, max: 500 })} MB`,
    sharedWith: faker.internet.email(),
    destination: `/${faker.system.directoryPath()}`,
    duration: `${faker.number.int({ min: 15, max: 120 })} minutes`,
    version: faker.system.semver(),
    errorMessage: faker.hacker.phrase(),
    errorCode: `E${faker.string.numeric(4)}`,
    warningMessage: faker.hacker.phrase(),
    configKey: faker.helpers.arrayElement(["rate_limit", "max_connections", "timeout", "cache_ttl"]),
    backupId: `BKP-${faker.string.alphanumeric(12).toUpperCase()}`,
    backupSize: `${faker.number.int({ min: 1, max: 100 })} GB`,
    serviceName: faker.helpers.arrayElement(["api-gateway", "auth-service", "worker", "scheduler"]),
    keyPrefix: faker.string.alphanumeric(8),
    rateLimit: faker.helpers.arrayElement([100, 500, 1000, 5000]),
    webhookUrl: faker.internet.url(),
    statusCode: faker.helpers.arrayElement([200, 201, 400, 401, 403, 404, 500, 502, 503]),
    integrationName: faker.helpers.arrayElement(["slack", "jira", "github", "salesforce", "hubspot"]),
    endpoint: `/api/v1/${faker.helpers.arrayElement(["users", "orders", "products", "reports"])}`,
    schemaVersion: `v${faker.number.int({ min: 1, max: 5 })}`,
    recipient: faker.internet.email(),
    emailSubject: faker.lorem.sentence(5),
    bounceReason: faker.helpers.arrayElement(["invalid_address", "mailbox_full", "domain_not_found"]),
    phoneNumber: faker.phone.number(),
    notificationType: faker.helpers.arrayElement(["push", "in_app", "email", "sms"]),
    sender: faker.internet.email(),
    callDuration: `${faker.number.int({ min: 1, max: 60 })}m ${faker.number.int({ min: 0, max: 59 })}s`,
    exportType: faker.helpers.arrayElement(["csv", "xlsx", "pdf", "json"]),
    importType: faker.helpers.arrayElement(["csv", "xlsx", "json"]),
    recordCount: faker.number.int({ min: 100, max: 50000 }),
    reportName: faker.helpers.arrayElement(["monthly_summary", "user_activity", "revenue_report", "audit_log"]),
    queryDuration: faker.number.int({ min: 10, max: 5000 }),
    dashboardName: faker.helpers.arrayElement(["overview", "analytics", "performance", "sales"]),
    alertName: faker.helpers.arrayElement(["high_cpu", "low_disk", "error_spike", "latency_alert"]),
    metricName: faker.helpers.arrayElement(["cpu_usage", "memory", "request_latency", "error_rate"]),
    anomalyValue: `${faker.number.int({ min: 80, max: 150 })}%`,
    metricValue: `${faker.number.int({ min: 50, max: 100 })}%`,
    threshold: `${faker.number.int({ min: 70, max: 90 })}%`,
    consentType: faker.helpers.arrayElement(["marketing", "analytics", "third_party", "data_processing"]),
    policyName: faker.helpers.arrayElement(["privacy_policy", "terms_of_service", "cookie_policy", "dpa"]),
    policyVersion: faker.system.semver(),
    auditType: faker.helpers.arrayElement(["security", "compliance", "financial", "operational"]),
    findingsCount: faker.number.int({ min: 0, max: 25 }),
    resourceName: faker.helpers.arrayElement(["database", "storage", "api", "admin_panel"]),
    violationType: faker.helpers.arrayElement(["data_retention", "access_control", "encryption", "logging"]),
    taskName: faker.lorem.words(3),
    assignee: faker.internet.username().toLowerCase(),
    approvalType: faker.helpers.arrayElement(["expense", "access_request", "deployment", "policy_change"]),
    approver: faker.internet.username().toLowerCase(),
    workflowName: faker.helpers.arrayElement(["onboarding", "offboarding", "review", "deployment"]),
  };
}

function generateMeta(username: string): MetaData {
  const browsers = ["Chrome", "Firefox", "Safari", "Edge"];
  const oses = ["Windows 11", "macOS Sonoma", "Ubuntu 22.04", "iOS 17", "Android 14"];
  const roles = ["admin", "user", "viewer", "editor", "super_admin"];
  const permissionSets = [
    ["read"],
    ["read", "write"],
    ["read", "write", "delete"],
    ["read", "write", "delete", "admin"],
  ];

  return {
    username,
    userId: faker.string.uuid(),
    email: faker.internet.email({ firstName: username }),
    ip: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    sessionId: faker.string.alphanumeric(32),
    deviceType: faker.helpers.arrayElement(["desktop", "mobile", "tablet"]),
    browser: faker.helpers.arrayElement(browsers),
    os: faker.helpers.arrayElement(oses),
    country: faker.location.country(),
    city: faker.location.city(),
    timezone: faker.location.timeZone(),
    organizationId: faker.string.uuid(),
    organizationName: faker.company.name(),
    role: faker.helpers.arrayElement(roles),
    permissions: faker.helpers.arrayElement(permissionSets),
    requestId: faker.string.uuid(),
    traceId: faker.string.hexadecimal({ length: 32, prefix: "" }),
    spanId: faker.string.hexadecimal({ length: 16, prefix: "" }),
    environment: faker.helpers.arrayElement(["production", "staging", "development"]),
    version: faker.system.semver(),
    feature_flags: {
      new_dashboard: faker.datatype.boolean(),
      beta_features: faker.datatype.boolean(),
      dark_mode: faker.datatype.boolean(),
      ai_assistant: faker.datatype.boolean(),
    },
  };
}

function generateActivityEvent(): ActivityEvent {
  const category = faker.helpers.arrayElement(categories);
  const subcategory = faker.helpers.arrayElement(categoryMap[category]);
  const username = faker.internet.username().toLowerCase();
  const context = generateLogContext();

  return {
    externalRef: faker.string.uuid(),
    category,
    subcategory,
    log: logTemplates[category](subcategory, username, context),
    meta: generateMeta(username),
    createdAt: faker.date.recent({ days: 30 }),
  };
}

function generateActivityEvents(count: number): ActivityEvent[] {
  return Array.from({ length: count }, generateActivityEvent);
}

// ============================================
// OUTPUT FORMATTERS
// ============================================
function toJSON(events: ActivityEvent[]): string {
  return JSON.stringify(events, null, 2);
}

function toNDJSON(events: ActivityEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join("\n");
}

function toCSV(events: ActivityEvent[]): string {
  const flattenObject = (obj: Record<string, any>, prefix = ""): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        result[newKey] = value.join(";");
      } else if (value instanceof Date) {
        result[newKey] = value.toISOString();
      } else {
        result[newKey] = value;
      }
    }
    return result;
  };

  const flatEvents = events.map((e) => flattenObject(e as unknown as Record<string, any>));
  const headers = Object.keys(flatEvents[0]);
  const escapeCSV = (val: any): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = flatEvents.map((e) => headers.map((h) => escapeCSV(e[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

// ============================================
// MAIN
// ============================================
type OutputFormat = "json" | "ndjson" | "csv" | "all";

interface Options {
  count: number;
  format: OutputFormat;
  outputDir: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    count: 100,
    format: "all",
    outputDir: "./output",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-c":
      case "--count":
        options.count = parseInt(args[++i], 10);
        break;
      case "-f":
      case "--format":
        options.format = args[++i] as OutputFormat;
        break;
      case "-o":
      case "--output":
        options.outputDir = args[++i];
        break;
    }
  }

  return options;
}

function main() {
  const options = parseArgs();
  const events = generateActivityEvents(options.count);

  // Ensure output directory exists
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `activity_events_${timestamp}`;

  const outputs: Record<string, { content: string; ext: string }> = {
    json: { content: toJSON(events), ext: "json" },
    ndjson: { content: toNDJSON(events), ext: "ndjson" },
    csv: { content: toCSV(events), ext: "csv" },
  };

  if (options.format === "all") {
    for (const [format, { content, ext }] of Object.entries(outputs)) {
      const filePath = path.join(options.outputDir, `${baseName}.${ext}`);
      fs.writeFileSync(filePath, content);
      console.log(`✓ Generated ${format.toUpperCase()}: ${filePath}`);
    }
  } else {
    const { content, ext } = outputs[options.format];
    const filePath = path.join(options.outputDir, `${baseName}.${ext}`);
    fs.writeFileSync(filePath, content);
    console.log(`✓ Generated ${options.format.toUpperCase()}: ${filePath}`);
  }

  console.log(`\n📊 Generated ${options.count} activity events`);
  console.log(`📁 Output directory: ${path.resolve(options.outputDir)}`);
}

main();
