import { expect, test } from "vitest";
import { createPlatform, type LaunchRecord } from "../src/index.js";

const tool = {
  clientId: "client-1",
  deploymentIds: ["deployment-1"],
  oidcLoginInitiationUrl: "https://tool.example.com/lti/login",
  targetLinkUri: "https://tool.example.com/lti/launch",
};

const link = {
  linkId: "link-1",
  clientId: "client-1",
  deploymentId: "deployment-1",
};

test("redirects to the tool login url with the login params", async () => {
  const platform = createPlatform({
    issuer: "http://localhost:4000",
    registrations: {
      findByClientId: async (clientId) =>
        clientId === tool.clientId ? tool : undefined,
    },
    links: {
      findLink: async (linkId) => (linkId === link.linkId ? link : undefined),
    },
    launches: { save: async () => {} },
  });

  const result = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });

  if (result.type !== "redirect") {
    throw new Error("not a redirect");
  }
  const url = new URL(result.url);

  expect(url.origin + url.pathname).toBe("https://tool.example.com/lti/login");
  expect(url.searchParams.get("iss")).toBe("http://localhost:4000");
  expect(url.searchParams.get("login_hint")).toBe("123");
  expect(url.searchParams.get("target_link_uri")).toBe(
    "https://tool.example.com/lti/launch",
  );
  expect(url.searchParams.get("client_id")).toBe("client-1");
  expect(url.searchParams.get("lti_deployment_id")).toBe("deployment-1");
});

test("creates a launch record and saves it to the store", async () => {
  const launches: LaunchRecord[] = [];

  const platform = createPlatform({
    issuer: "http://localhost:4000",
    registrations: {
      findByClientId: async (clientId) =>
        clientId === tool.clientId ? tool : undefined,
    },
    links: {
      findLink: async (linkId) => (linkId === link.linkId ? link : undefined),
    },
    launches: {
      save: async (input) => {
        launches.push(input);
      },
    },
  });

  const result = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });
  if (result.type !== "redirect") {
    throw new Error("not a redirect");
  }

  const url = new URL(result.url);

  expect(url.searchParams.get("lti_message_hint")).not.toBeNull();

  expect(launches.length).toBe(1);
  expect(launches[0]).toMatchObject({
    messageHint: url.searchParams.get("lti_message_hint"),
    linkId: "link-1",
    userId: "123",
    clientId: "client-1",
    deploymentId: "deployment-1",
  });
});

test("message hint is different for each login, same linkId, same user id", async () => {
  const platform = createPlatform({
    issuer: "http://localhost:4000",
    registrations: {
      findByClientId: async (clientId) =>
        clientId === tool.clientId ? tool : undefined,
    },
    links: {
      findLink: async (linkId) => (linkId === link.linkId ? link : undefined),
    },
    launches: {
      save: async () => {},
    },
  });

  const firstResult = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });

  // same linkId, same user id
  const secondResult = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });

  if (firstResult.type !== "redirect" || secondResult.type !== "redirect") {
    throw new Error("not a redirect");
  }

  const firstUrl = new URL(firstResult.url);
  const secondUrl = new URL(secondResult.url);

  expect(firstUrl.searchParams.get("lti_message_hint")).not.toBe(
    secondUrl.searchParams.get("lti_message_hint"),
  );
  expect(
    (firstUrl.searchParams.get("lti_message_hint") ?? "").length,
  ).toBeGreaterThanOrEqual(22);
  expect(firstUrl.searchParams.get("lti_message_hint")).toMatch(
    /^[A-Za-z0-9_-]+$/,
  );
});

test("the target_link_uri ovverrides the tool default", async () => {
  const quizLink = {
    ...link,
    linkId: "link-2",
    targetLinkUri: "https://tool.example.com/lti/quiz",
  };

  const platform = createPlatform({
    issuer: "http://localhost:4000",
    registrations: {
      findByClientId: async (clientId) =>
        clientId === tool.clientId ? tool : undefined,
    },
    links: {
      findLink: async (linkId) =>
        linkId === quizLink.linkId ? quizLink : undefined,
    },
    launches: { save: async () => {} },
  });

  const result = await platform.initiateLogin({
    linkId: "link-2",
    currentUserId: "123",
  });

  if (result.type !== "redirect") {
    throw new Error("not a redirect");
  }
  const url = new URL(result.url);

  expect(url.searchParams.get("target_link_uri")).toBe(
    "https://tool.example.com/lti/quiz",
  );
});

test("keeps the query params of the tool login url", async () => {
  const toolWithParams = {
    ...tool,
    oidcLoginInitiationUrl: "https://tool.example.com/lti/login?param=123",
  };

  const platform = createPlatform({
    issuer: "http://localhost:4000",
    registrations: {
      findByClientId: async (clientId) =>
        clientId === toolWithParams.clientId ? toolWithParams : undefined,
    },
    links: {
      findLink: async (linkId) => (linkId === link.linkId ? link : undefined),
    },
    launches: { save: async () => {} },
  });

  const result = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });

  if (result.type !== "redirect") {
    throw new Error("not a redirect");
  }

  const url = new URL(result.url);
  expect(url.searchParams.get("param")).toBe("123");
  expect(url.searchParams.get("iss")).toBe("http://localhost:4000");
});
