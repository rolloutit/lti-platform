import { randomBytes } from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import session from "express-session";
import {
  createPlatform,
  renderAutoSubmitForm,
  toJwks,
  type LaunchRecord,
  type SigningKey,
} from "@rolloutit/lti-platform";
import { course, ISSUER, links, roles, tools, users } from "./data.js";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export const createApp = (signingKey: SigningKey): Express => {
  const launches = new Map<string, LaunchRecord>();

  const platform = createPlatform({
    issuer: ISSUER,
    signingKey,
    registrations: {
      findByClientId: async (clientId) =>
        tools.find((tool) => tool.clientId === clientId),
    },
    links: {
      findLink: async (linkId) => links.find((link) => link.linkId === linkId),
    },
    users: {
      findUser: async (userId) => users.find((user) => user.userId === userId),
      getRoles: async (userId, contextId) =>
        contextId === course.id ? (roles[userId] ?? []) : [],
    },
    launches: {
      save: async (record) => {
        launches.set(record.messageHint, record);
      },
      consume: async (messageHint) => {
        const record = launches.get(messageHint);
        launches.delete(messageHint);
        return record;
      },
    },
  });

  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: randomBytes(32).toString("base64url"),
      resave: false,
      saveUninitialized: false,
      cookie: { sameSite: "lax" },
    }),
  );

  app.get("/", (req, res) => {
    const user = users.find((user) => user.userId === req.session.userId);
    if (!user) {
      const buttons = users
        .map(
          (user) =>
            `<button name="userId" value="${user.userId}">${user.name}</button>`,
        )
        .join(" ");
      res.send(
        `<h1>Mini LMS</h1><form method="post" action="/login">Log in as ${buttons}</form>`,
      );
      return;
    }

    const items = links
      .map(
        (link) =>
          `<li><a href="/launch/${link.linkId}" target="_blank">${link.title}</a></li>`,
      )
      .join("");
    res.send(
      `<h1>Mini LMS</h1>
      <p>${user.name} <form method="post" action="/logout" style="display:inline"><button>Log out</button></form></p>
      <h2>${course.title}</h2><ul>${items}</ul>`,
    );
  });

  app.post("/login", (req, res) => {
    req.session.userId = req.body.userId;
    res.redirect("/");
  });

  app.post("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
  });

  app.get("/.well-known/jwks.json", (_req, res) => {
    res.json(toJwks([signingKey]));
  });

  app.get("/launch/:linkId", async (req, res) => {
    const result = await platform.initiateLogin({
      linkId: req.params.linkId,
      currentUserId: req.session.userId,
    });
    if (result.type === "redirect") {
      res.redirect(result.url);
    } else {
      res.sendStatus(result.status);
    }
  });

  const authorize = async (req: Request, res: Response) => {
    const source = req.method === "GET" ? req.query : (req.body ?? {});
    const params: Record<string, string> = {};
    for (const [name, value] of Object.entries(source)) {
      if (typeof value === "string") {
        params[name] = value;
      }
    }

    // A cross-site POST (saLTIre's default) comes without the SameSite=Lax
    // session cookie. Post the same params again from our own page: that
    // request is same-site, so the cookie goes with it. Moodle does the same.
    if (req.method === "POST" && !req.session.userId && !params.repost) {
      res.send(
        renderAutoSubmitForm({
          action: `${ISSUER}/lti/authorize`,
          fields: { ...params, repost: "1" },
        }),
      );
      return;
    }

    const result = await platform.authorize({
      params,
      currentUserId: req.session.userId,
    });
    if (result.type === "form_post") {
      res.send(renderAutoSubmitForm(result));
    } else {
      res.sendStatus(result.status);
    }
  };

  app.get("/lti/authorize", authorize);
  app.post("/lti/authorize", authorize);

  return app;
};
