import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("Hello World Test", () => {
  assertEquals("hello world", "hello world");
});

Deno.test("Basic Math Test", () => {
  assertEquals(1 + 1, 2);
}); 