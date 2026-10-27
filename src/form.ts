import type { AutoSubmitForm } from "./types.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const renderAutoSubmitForm = (form: AutoSubmitForm) => {
  const inputs = Object.entries(form.fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
    )
    .join("\n");

  return `<!doctype html>
            <html>
                <head>
                    <meta charset="utf-8">
                </head>
                <body>
                    <form method="post" action="${escapeHtml(form.action)}">
                        ${inputs}
                        <noscript><button type="submit">Continue</button></noscript>
                    </form>
                    <script>document.forms[0].submit();</script>
                </body>
            </html>`;
};
