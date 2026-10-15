import { randomBytes } from 'node:crypto'
import express, { type Request, type RequestHandler } from 'express'
import session from 'express-session'
import { ISSUER, PORT } from './config.js'
import {
  coursesOfUser,
  findCourse,
  findMembership,
  findUser,
  findUserByUsername,
  INSTRUCTOR,
  linksOfCourse,
} from './data.js'
import { escapeHtml, page } from './html.js'

declare module 'express-session' {
  interface SessionData {
    userId: string
  }
}

const SESSION_COOKIE = 'mini_lms_sid'

const app = express()

app.use(express.urlencoded({ extended: false }))
app.use(
  session({
    name: SESSION_COOKIE,
    // Sessions live in memory, so a new secret on every start loses nothing.
    secret: randomBytes(32).toString('base64url'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Not 'strict': the tool sends the browser to /lti/authorize with a top-level GET navigation
      // from its own domain. That is a cross-site request, so a strict cookie would be left out,
      // the user would look logged out and every launch would end in login_required.
      sameSite: 'lax',
      // http://localhost
      secure: false,
    },
  }),
)

const currentUser = (req: Request) =>
  req.session.userId ? findUser(req.session.userId) : undefined

app.get('/', (req, res) => {
  const user = currentUser(req)

  if (!user) {
    res.send(
      page({
        title: 'Login',
        body: `<p class="muted">Fake login, pick a user.</p>
        <form method="post" action="/login">
          <button type="submit" name="username" value="teacher">Login as teacher</button>
          <button type="submit" name="username" value="student">Login as student</button>
        </form>`,
      }),
    )
    return
  }

  const items = coursesOfUser(user.id)
    .map(
      (course) =>
        `<li><a href="/courses/${encodeURIComponent(course.id)}">${escapeHtml(course.title)}</a></li>`,
    )
    .join('')

  res.send(page({ title: `Hello, ${user.givenName}`, user, body: `<ul>${items}</ul>` }))
})

app.post('/login', (req, res, next) => {
  const user = findUserByUsername(String(req.body?.username ?? ''))
  if (!user) {
    res.status(400).send(page({ title: 'Unknown user', body: '<p><a href="/">Back</a></p>' }))
    return
  }

  // New session id on login, so an id set before the login can't be reused.
  req.session.regenerate((err) => {
    if (err) return next(err)
    req.session.userId = user.id
    res.redirect(303, '/')
  })
})

app.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err)
    res.clearCookie(SESSION_COOKIE)
    res.redirect(303, '/')
  })
})

app.get('/courses/:id', (req, res) => {
  const user = currentUser(req)
  if (!user) {
    res.redirect('/')
    return
  }

  const course = findCourse(req.params.id)
  if (!course) {
    res.status(404).send(page({ title: 'Course not found', user, body: '' }))
    return
  }

  const membership = findMembership(course.id, user.id)
  if (!membership) {
    res.status(403).send(page({ title: 'Not enrolled', user, body: '' }))
    return
  }

  const role = membership.roles.includes(INSTRUCTOR) ? 'Instructor' : 'Learner'
  // The launch opens in a new window, not in an iframe: ltijs keeps the state in localStorage,
  // which is partitioned (Chrome) or blocked (Safari) in a third-party iframe.
  const items = linksOfCourse(course.id)
    .map(
      (link) =>
        `<li><a href="/lti/launch/${encodeURIComponent(link.id)}" target="_blank">${escapeHtml(link.title)}</a></li>`,
    )
    .join('')

  res.send(
    page({
      title: course.title,
      user,
      body: `<p class="muted">${escapeHtml(course.label)} · ${role}</p><ul>${items}</ul>`,
    }),
  )
})

const notImplemented: RequestHandler = (_req, res) => {
  res.status(501).type('text').send('Not implemented')
}

app.route('/lti/launch/:linkId').get(notImplemented).post(notImplemented)
app.route('/lti/authorize').get(notImplemented).post(notImplemented)

app.listen(PORT, (err) => {
  if (err) throw err
  console.log(`Mini-LMS running at ${ISSUER}`)
})
