[Home](../../index.md) > [Reference](../index.md) > [Security](index.md) > **AI Data Policy**

# AI Data Policy

## KnowStack Policy

User data is **never** used for AI model training by KnowStack.

- Documents ingested into KnowStack are stored for retrieval only
- Query data is not retained beyond the immediate request lifecycle
- No user data is shared with third parties for training purposes

## Third-Party AI Providers

### OpenAI

**Official Source**: [OpenAI API Data Usage Policy](https://openai.com/policies/api-data-usage-policies)

| Property                     | Value                                               |
| ---------------------------- | --------------------------------------------------- |
| Provider                     | OpenAI                                              |
| Data Used for Training       | No (API data is not used for training by default)   |
| Default Data Retention       | 30 days                                             |
| Zero Data Retention Eligible | Yes (with requirements)                             |
| Zero Retention Requirements  | OpenAI organization opt-in and enterprise agreement |

### Important Notes

- **Default retention is 30 days**: OpenAI retains API request/response data for 30 days for abuse monitoring and debugging purposes
- **Zero data retention is NOT automatic**: It requires an explicit OpenAI enterprise agreement and organization-level opt-in
- **We do not claim zero retention** unless verified for the specific OpenAI organization in use
- OpenAI's data usage policy may change; refer to the official policy linked above for current terms

### How KnowStack Uses OpenAI

1. User documents are sent as context chunks for semantic queries
2. User questions are sent as prompts
3. Responses are returned to the user
4. KnowStack does not store OpenAI responses beyond the request lifecycle

## See Also

- [Security Whitepaper](../../explanation/security/whitepaper.md)
- [Security Controls](compliance.md)
