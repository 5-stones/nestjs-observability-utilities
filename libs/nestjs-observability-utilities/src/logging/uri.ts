/** Template tag that uri encodes expressions. */
export function uri(
  strings: TemplateStringsArray,
  ...args: Array<string | number | boolean>
): string {
  let uri = '';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    uri += strings[i] + encodeURIComponent(arg);
  }
  return uri + strings[args.length];
}
