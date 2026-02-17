# Daycare Activity Events Generator

A TypeScript-based synthetic data generator for daycare/childcare activity events. Generates realistic activity logs for children, teachers, parents, and facilities using Faker.js.

## Installation

```bash
npm install
```

## Usage

```bash
npx ts-node generate-activity-events.ts [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--count` | `-c` | Number of events to generate | `100` |
| `--format` | `-f` | Output format | `all` |
| `--output` | `-o` | Output directory | `./output` |

### Output Formats

| Format | Description |
|--------|-------------|
| `json` | Pretty-printed JSON array |
| `ndjson` | Newline-delimited JSON (one event per line) |
| `csv` | Flattened CSV with all metadata fields |
| `llm` | Token-compact format optimized for LLM ingestion |
| `llm-grouped` | Events grouped by child (very token-efficient) |
| `llm-pipe` | Ultra-compact pipe-delimited format |
| `all` | Generates all formats (default) |

### Examples

```bash
# Generate 100 events in all formats
npx ts-node generate-activity-events.ts

# Generate 500 events in JSON format
npx ts-node generate-activity-events.ts -c 500 -f json

# Generate 1000 events to custom directory
npx ts-node generate-activity-events.ts -c 1000 -o ./data
```

## Event Categories

The generator produces events across 10 categories:

| Category | Description |
|----------|-------------|
| `child_action` | Child-initiated activities (playing, drawing, crafts, etc.) |
| `child_physical` | Physical activities (running, climbing, sports, etc.) |
| `child_social` | Social interactions (sharing, helping, making friends) |
| `child_learning` | Learning achievements (letters, numbers, colors, shapes) |
| `teacher_action` | Teacher activities (feeding, reading stories, assessments) |
| `assessment` | Developmental assessments and milestones |
| `parent_home` | Home activities logged by parents |
| `parent_teacher` | Parent-teacher communication events |
| `daily_routine` | Routine events (arrival, meals, naps, departure) |
| `health` | Health observations (temperature, mood, symptoms) |

## Event Structure

Each event contains:

```typescript
{
  externalRef: string;      // Unique event ID
  category: string;         // Event category
  subcategory: string;      // Specific event type
  log: string;              // Human-readable description
  meta: MetaData;           // Rich metadata object
  createdAt: Date;          // Event timestamp
}
```

### Metadata Fields

- **Child info**: name, ID, age, classroom, age group
- **People**: teacher, parent, friend references
- **Activity details**: duration, mood, specific items (songs, books, foods)
- **Learning specifics**: letters, numbers, colors, shapes
- **Health data**: temperature, symptoms, injuries, medications
- **Meal/sleep data**: consumption levels, nap duration, bottle amounts
- **Session info**: source app, version, facility, location

## Sample Output

### LLM Compact Format
```
[09:15] Emma(18m,Ladybugs) act:drew_picture by:Ms. Johnson | mood:Happy
[09:32] Liam(36m,Dragonflies) learn:recognized_letter by:Ms. Garcia | letter:B
[10:00] Olivia(8m,Butterflies) daily:drank_bottle by:Ms. Williams | bottle:6oz
```

### LLM Grouped Format
```
## Emma (18m, Ladybugs)
- 09:15 drew_picture
- 09:45 shared_with_friend (w/Liam)
- 10:30 ate_snack (ate:most, Crackers)
```

## Dependencies

- `@faker-js/faker` - Realistic fake data generation
- `typescript` - TypeScript support
- `ts-node` - TypeScript execution
