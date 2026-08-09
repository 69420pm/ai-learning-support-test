import { proxy } from './proxy';

export { config } from './proxy';

export function middleware(request: Parameters<typeof proxy>[0]) {
  return proxy(request);
}
