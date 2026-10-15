import type { User } from './data.js'

// Local helper until the library has its own escapeHtml (form-post module).
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

type PageOptions = {
  title: string
  user?: User | undefined
  // Trusted HTML: every user-provided value in it has to be escaped by the caller.
  body: string
}

export function page({ title, user, body }: PageOptions): string {
  const account = user
    ? `<div>${escapeHtml(user.name)}
        <form method="post" action="/logout"><button type="submit">Logout</button></form></div>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Mini-LMS</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
      header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; margin-bottom: 1.5rem; }
      form { display: inline; }
      button { font: inherit; cursor: pointer; }
      .muted { color: #666; }
    </style>
  </head>
  <body>
    <header><p><a href="/">Mini-LMS</a></p>${account}</header>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </body>
</html>
`
}
