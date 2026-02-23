[Home](../../index.md) > [Reference](../index.md) > [Integrations](index.md) > **JavaScript Examples**

# JavaScript Examples

Code examples for using KnowStack with JavaScript and TypeScript via the MCP endpoint.

## Fetch API

```typescript
const MCP_URL = 'http://localhost:3000/api/v1/mcp';
const ORG_SLUG = 'my-org';
const PROJECT_SLUG = 'api-docs';

async function mcpCall(method: string, params?: Record<string, unknown>) {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ks-org': ORG_SLUG,
      'x-ks-project': PROJECT_SLUG,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
}

// Query documentation
const result = await mcpCall('tools/call', {
  name: 'knowstack.query',
  arguments: { query: 'How do I get started?' },
});
console.log(result.result.content[0].text);
```

## Client Class

```typescript
class KnowStackClient {
  constructor(
    private orgSlug: string,
    private projectSlug: string,
    private baseUrl = 'http://localhost:3000/api/v1/mcp',
  ) {}

  private async call(method: string, params?: Record<string, unknown>) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ks-org': this.orgSlug,
        'x-ks-project': this.projectSlug,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message);
    }
    return json.result;
  }

  async query(question: string, context?: string) {
    return this.call('tools/call', {
      name: 'knowstack.query',
      arguments: { query: question, context },
    });
  }

  async searchDocuments(q: string, limit = 10) {
    return this.call('tools/call', {
      name: 'knowstack.search_documents',
      arguments: { q, limit },
    });
  }

  async listTools() {
    return this.call('tools/list');
  }
}

// Usage
const client = new KnowStackClient('my-org', 'api-docs');
const result = await client.query('How do I get started?');
```

## Error Handling

```typescript
try {
  const result = await client.query('How do I get started?');
  const text = result.content[0].text;

  if (result.isError) {
    console.error('Tool error:', text);
  } else {
    console.log(text);
  }
} catch (error) {
  console.error('Network/HTTP error:', error);
}
```

## See Also

- [cURL Examples](curl.md)
- [MCP Reference](../api/mcp.md)
- [Error Codes](../troubleshooting/errors.md)
