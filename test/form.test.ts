import { expect, test } from "vitest";
import { renderAutoSubmitForm } from "../src/index.js";

test("renders a post form to the action with a hidden input per field", () => {
  const html = renderAutoSubmitForm({
    action: "https://tool.example.com/lti/launch",
    fields: { state: "state-1", id_token: "token-1" },
  });

  expect(html).toContain(
    '<form method="post" action="https://tool.example.com/lti/launch">',
  );
  expect(html).toContain('<input type="hidden" name="state" value="state-1">');
  expect(html).toContain(
    '<input type="hidden" name="id_token" value="token-1">',
  );
});

test("escapes the action and the field values", () => {
  const html = renderAutoSubmitForm({
    action: "https://tool.example.com/lti/launch?a=1&b=2",
    fields: { state: '"><script>alert(1)</script>' },
  });

  expect(html).toContain(
    'action="https://tool.example.com/lti/launch?a=1&amp;b=2"',
  );
  expect(html).toContain(
    'value="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"',
  );
  expect(html).not.toContain("<script>alert");
});

test("escapes the field names", () => {
  // in the SameSite repost the field names come from the request
  const html = renderAutoSubmitForm({
    action: "https://platform.example.com/lti/authorize",
    fields: { '"><script>alert(1)</script>': "x" },
  });

  expect(html).toContain(
    'name="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"',
  );
  expect(html).not.toContain("<script>alert");
});

test("is a full html page that submits the form on load", () => {
  const html = renderAutoSubmitForm({
    action: "https://tool.example.com/lti/launch",
    fields: { state: "state-1" },
  });

  expect(html.trimStart().startsWith("<!doctype html>")).toBe(true);
  expect(html).toContain('<meta charset="utf-8">');
  expect(html).toContain("document.forms[0].submit()");
});

test("has a submit button for browsers without javascript", () => {
  const html = renderAutoSubmitForm({
    action: "https://tool.example.com/lti/launch",
    fields: { state: "state-1" },
  });

  const button = html.indexOf('<noscript><button type="submit">');
  expect(button).toBeGreaterThan(-1);
  // outside the form the button would not submit it
  expect(button).toBeLessThan(html.indexOf("</form>"));
});
