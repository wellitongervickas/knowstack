import * as p from '@clack/prompts';

function handleCancel(value: unknown): asserts value is string | boolean {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
}

export async function askText(
  message: string,
  opts?: {
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string | undefined) => string | undefined;
  },
): Promise<string> {
  const value = await p.text({
    message,
    placeholder: opts?.placeholder,
    defaultValue: opts?.defaultValue,
    validate: opts?.validate,
  });
  handleCancel(value);
  return value;
}

export async function askSelect(
  message: string,
  options: { value: string; label: string; hint?: string }[],
): Promise<string> {
  const value = await p.select({ message, options });
  handleCancel(value);
  return value as string;
}

export async function askMultiSelect(
  message: string,
  options: { value: string; label: string; hint?: string }[],
): Promise<string[]> {
  const value = await p.multiselect({ message, options, required: false });
  handleCancel(value);
  return value as unknown as string[];
}

export async function askConfirm(message: string): Promise<boolean> {
  const value = await p.confirm({ message });
  handleCancel(value);
  return value as boolean;
}

export function intro(title: string): void {
  p.intro(title);
}

export function outro(message: string): void {
  p.outro(message);
}

export function note(message: string, title?: string): void {
  p.note(message, title);
}

export function log(message: string): void {
  p.log.info(message);
}

export function logStep(message: string): void {
  p.log.step(message);
}

export function logSuccess(message: string): void {
  p.log.success(message);
}

export function logWarning(message: string): void {
  p.log.warn(message);
}

export function logError(message: string): void {
  p.log.error(message);
}

export function createSpinner(): { start: (msg: string) => void; stop: (msg: string) => void } {
  return p.spinner();
}
