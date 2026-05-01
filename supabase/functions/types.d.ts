// Deno global types for Supabase Edge Functions
declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};