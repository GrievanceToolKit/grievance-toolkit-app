// Utility to merge class names (like clsx but minimal)
export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}
