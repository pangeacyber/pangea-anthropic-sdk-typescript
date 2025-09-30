# Pangea + Anthropic TypeScript API Library

A wrapper around the Anthropic TypeScript library that wraps the
[Messages API](https://docs.claude.com/en/api/messages) with Pangea AI Guard.
Supports Node.js v22 and greater.

## Installation

```bash
npm install @pangeacyber/anthropic
```

## Usage

```typescript
import PangeaAnthropic from "@pangeacyber/anthropic";

const client = new PangeaAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  pangeaApiKey: process.env.PANGEA_API_KEY,
});

const message = await client.messages.create({
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
  model: "claude-sonnet-4-5-20250929",
});

console.log(message.content);
```
