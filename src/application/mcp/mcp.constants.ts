import { APP_VERSION } from '@/app.constants';

/**
 * MCP module constants.
 * Static values for the Model Context Protocol server configuration.
 */

// =============================================================================
// MCP SERVER METADATA
// =============================================================================

/** MCP server name identifier. */
export const MCP_SERVER_NAME = 'knowstack';

/** MCP server version. */
export const MCP_SERVER_VERSION = APP_VERSION;

// =============================================================================
// MCP TOOL NAMES — get/save/delete pattern
// =============================================================================

// Documents
export const MCP_TOOL_GET_DOCUMENTS = 'knowstack.get_documents';
export const MCP_TOOL_SAVE_DOCUMENTS = 'knowstack.save_documents';
export const MCP_TOOL_DELETE_DOCUMENTS = 'knowstack.delete_documents';

// Agents
export const MCP_TOOL_GET_AGENTS = 'knowstack.get_agents';
export const MCP_TOOL_SAVE_AGENTS = 'knowstack.save_agents';
export const MCP_TOOL_DELETE_AGENTS = 'knowstack.delete_agents';

// Commands
export const MCP_TOOL_GET_COMMANDS = 'knowstack.get_commands';
export const MCP_TOOL_SAVE_COMMANDS = 'knowstack.save_commands';
export const MCP_TOOL_DELETE_COMMANDS = 'knowstack.delete_commands';

// Skills
export const MCP_TOOL_GET_SKILLS = 'knowstack.get_skills';
export const MCP_TOOL_SAVE_SKILLS = 'knowstack.save_skills';
export const MCP_TOOL_DELETE_SKILLS = 'knowstack.delete_skills';

// Templates
export const MCP_TOOL_GET_TEMPLATES = 'knowstack.get_templates';
export const MCP_TOOL_SAVE_TEMPLATES = 'knowstack.save_templates';
export const MCP_TOOL_DELETE_TEMPLATES = 'knowstack.delete_templates';

// Memory
export const MCP_TOOL_GET_MEMORY = 'knowstack.get_memory';
export const MCP_TOOL_SAVE_MEMORY = 'knowstack.save_memory';
export const MCP_TOOL_UPDATE_MEMORY = 'knowstack.update_memory';
export const MCP_TOOL_DELETE_MEMORY = 'knowstack.delete_memory';

// Cross-cutting
export const MCP_TOOL_SEARCH_INSTRUCTIONS = 'knowstack.search_instructions';
export const MCP_TOOL_QUERY = 'knowstack.query';

// Backfill
export const MCP_TOOL_BACKFILL_EMBEDDINGS = 'knowstack.backfill_embeddings';
export const MCP_TOOL_BACKFILL_INSTRUCTIONS = 'knowstack.backfill_instructions';

// Admin — Organizations
export const MCP_TOOL_CREATE_ORGANIZATION = 'knowstack.create_organization';
export const MCP_TOOL_GET_ORGANIZATION = 'knowstack.get_organization';
export const MCP_TOOL_LIST_ORGANIZATIONS = 'knowstack.list_organizations';

// Admin — Projects
export const MCP_TOOL_CREATE_PROJECT = 'knowstack.create_project';
export const MCP_TOOL_GET_PROJECT = 'knowstack.get_project';
export const MCP_TOOL_LIST_PROJECTS = 'knowstack.list_projects';

// =============================================================================
// MCP TOOL DESCRIPTIONS
// =============================================================================

export const MCP_TOOL_GET_DOCUMENTS_DESCRIPTION =
  'Get documents from the project. Supports: list all (paginated), get by ID, or search by keyword. Use `id` for specific document, `q` for search, or no args for listing.';

export const MCP_TOOL_SAVE_DOCUMENTS_DESCRIPTION =
  'Save a document to the project. Creates a new document or updates existing one (deduplication by content hash). Returns the action taken (created, updated, or unchanged). Supports two modes: (1) Manual — provide `title` and `content` directly; (2) URL auto-fetch — provide only `sourceUrl` to fetch content automatically (title is extracted from the page, or override with `title`).';

export const MCP_TOOL_DELETE_DOCUMENTS_DESCRIPTION =
  'Delete a document by ID. Permanently removes the document and invalidates related caches.';

export const MCP_TOOL_GET_AGENTS_DESCRIPTION =
  'Get AI agent instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.';

export const MCP_TOOL_SAVE_AGENTS_DESCRIPTION =
  'Save an agent instruction. Creates a new agent or updates existing one by name. Supports two modes: (1) Manual — provide `content` directly; (2) URL auto-fetch — provide only `sourceUrl` to fetch content automatically.';

export const MCP_TOOL_DELETE_AGENTS_DESCRIPTION = 'Delete an agent instruction by name.';

export const MCP_TOOL_GET_COMMANDS_DESCRIPTION =
  'Get command instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.';

export const MCP_TOOL_SAVE_COMMANDS_DESCRIPTION =
  'Save a command instruction. Creates a new command or updates existing one by name. Supports two modes: (1) Manual — provide `content` directly; (2) URL auto-fetch — provide only `sourceUrl` to fetch content automatically.';

export const MCP_TOOL_DELETE_COMMANDS_DESCRIPTION = 'Delete a command instruction by name.';

export const MCP_TOOL_GET_SKILLS_DESCRIPTION =
  'Get skill instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.';

export const MCP_TOOL_SAVE_SKILLS_DESCRIPTION =
  'Save a skill instruction. Creates a new skill or updates existing one by name. Supports two modes: (1) Manual — provide `content` directly; (2) URL auto-fetch — provide only `sourceUrl` to fetch content automatically.';

export const MCP_TOOL_DELETE_SKILLS_DESCRIPTION = 'Delete a skill instruction by name.';

export const MCP_TOOL_GET_TEMPLATES_DESCRIPTION =
  'Get template instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.';

export const MCP_TOOL_SAVE_TEMPLATES_DESCRIPTION =
  'Save a template instruction. Creates a new template or updates existing one by name. Supports two modes: (1) Manual — provide `content` directly; (2) URL auto-fetch — provide only `sourceUrl` to fetch content automatically.';

export const MCP_TOOL_DELETE_TEMPLATES_DESCRIPTION = 'Delete a template instruction by name.';

export const MCP_TOOL_GET_MEMORY_DESCRIPTION =
  'Get memory entries for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.';

export const MCP_TOOL_SAVE_MEMORY_DESCRIPTION =
  "Save a memory entry. Creates a new entry if the name doesn't exist, or updates the content if it does. Memory entries are PRIVATE to the project.";

export const MCP_TOOL_UPDATE_MEMORY_DESCRIPTION =
  "Update a memory entry using str_replace semantics. Finds old_str in the entry's content and replaces with new_str. old_str must match exactly once.";

export const MCP_TOOL_DELETE_MEMORY_DESCRIPTION =
  'Delete a memory entry by name. Permanently removes the entry from the project.';

export const MCP_TOOL_SEARCH_INSTRUCTIONS_DESCRIPTION =
  'Search instructions by keyword query. Returns lightweight results (name, type, visibility, description, score). Use for discovery, then fetch full content with get_agents/get_commands/get_memory/get_skills/get_templates.';

export const MCP_TOOL_QUERY_DESCRIPTION =
  'Execute a natural language query against the project documentation. Returns an AI-generated answer with cited sources.';

export const MCP_TOOL_BACKFILL_EMBEDDINGS_DESCRIPTION =
  'Backfill embeddings for documents. Generates vector embeddings for documents that are missing or have stale embeddings. Supports dry-run for cost estimation.';

export const MCP_TOOL_BACKFILL_INSTRUCTIONS_DESCRIPTION =
  'Backfill embeddings for instructions. Generates vector embeddings for instructions that are missing or have stale embeddings. Supports dry-run for cost estimation.';

// Admin — Organizations
export const MCP_TOOL_CREATE_ORGANIZATION_DESCRIPTION =
  'Create a new organization. Requires `name` and `slug`. Slug must be unique, lowercase, and may contain letters, numbers, and hyphens.';

export const MCP_TOOL_GET_ORGANIZATION_DESCRIPTION =
  'Get an organization by slug. Returns organization details including ID, name, and project count. Use to check if an organization exists and resolve its ID.';

export const MCP_TOOL_LIST_ORGANIZATIONS_DESCRIPTION =
  'List all organizations. Returns all organizations ordered by creation date (newest first).';

// Admin — Projects
export const MCP_TOOL_CREATE_PROJECT_DESCRIPTION =
  'Create a new project within an organization. Requires `organizationSlug`, `name`, and `slug`. Project slug must be unique within the organization.';

export const MCP_TOOL_GET_PROJECT_DESCRIPTION =
  'Get a project by organization slug and project slug. Returns project details including ID. Use to check if a project exists.';

export const MCP_TOOL_LIST_PROJECTS_DESCRIPTION =
  'List all projects in an organization. Requires `organizationSlug`.';

// =============================================================================
// MCP ERROR MESSAGES
// =============================================================================

export const MCP_ERROR_MESSAGES = {
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  PROJECT_NOT_FOUND: 'Project not found',
  SLUG_ALREADY_TAKEN: 'Slug is already taken',
} as const;
