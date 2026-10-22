import { expect, test } from "vitest";
import {
  createPlatform,
  type LaunchStore,
  type Link,
  type Tool,
  type LaunchRecord,
} from "../src/index.js";

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

const makePlatform = (
  overrides: { tool?: Tool; link?: Link; launches?: LaunchStore } = {},
) => {
  const platformTool: Tool = overrides.tool ?? tool;
  const platformLink: Link = overrides.link ?? link;
  const platformLaunches: LaunchStore = overrides.launches ?? {
    save: async () => {},
  };
  return createPlatform({
    issuer: "http://localhost:4000",
    registrations: {
      findByClientId: async (clientId) =>
        clientId === platformTool.clientId ? platformTool : undefined,
    },
    links: {
      findLink: async (linkId) =>
        linkId === platformLink.linkId ? platformLink : undefined,
    },
    launches: platformLaunches,
  });
};

const recordingLaunches = () => {
  const saved: LaunchRecord[] = [];
  const launches: LaunchStore = {
    save: async (record) => {
      saved.push(record);
    },
  };
  return { launches, saved };
};

test("redirects to the tool login url with the login params", async () => {
  const platform = makePlatform();

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
  const { launches, saved } = recordingLaunches();
  const platform = makePlatform({ launches });

  const result = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });
  if (result.type !== "redirect") {
    throw new Error("not a redirect");
  }

  const url = new URL(result.url);

  expect(url.searchParams.get("lti_message_hint")).not.toBeNull();

  expect(saved.length).toBe(1);
  expect(saved[0]).toMatchObject({
    messageHint: url.searchParams.get("lti_message_hint"),
    linkId: "link-1",
    userId: "123",
    clientId: "client-1",
    deploymentId: "deployment-1",
  });
});

test("message hint is different for each login, same linkId, same user id", async () => {
  const platform = makePlatform();

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

test("the target_link_uri overrides the tool default", async () => {
  const quizLink: Link = {
    ...link,
    linkId: "link-2",
    targetLinkUri: "https://tool.example.com/lti/quiz",
  };

  const platform = makePlatform({ link: quizLink });

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

  const platform = makePlatform({ tool: toolWithParams });

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

test("if there is no current user, returns 401", async () => {
  const { launches, saved } = recordingLaunches();
  const platform = makePlatform({ launches });

  const result = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: undefined,
  });

  expect(result).toStrictEqual({ type: "error", status: 401 });
  expect(saved.length).toBe(0);
});

test("if the link is not found, returns 404", async () => {
  const { launches, saved } = recordingLaunches();
  const platform = makePlatform({ launches });

  const result = await platform.initiateLogin({
    linkId: "link-222",
    currentUserId: "123",
  });

  expect(result).toStrictEqual({ type: "error", status: 404 });
  expect(saved.length).toBe(0);
});

test("if the tool of the link is not registered, returns 500", async () => {
  const { launches, saved } = recordingLaunches();
  const platform = makePlatform({
    tool: {
      ...tool,
      clientId: "client-999",
    },
    launches,
  });

  const result = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });
  expect(result).toStrictEqual({ type: "error", status: 500 });
  expect(saved.length).toBe(0);
});

test("if the deployment is not registered for the tool, returns 500", async () => {
  const { launches, saved } = recordingLaunches();
  const platform = makePlatform({
    tool: {
      ...tool,
      deploymentIds: ["deployment-999"],
    },
    launches,
  });

  const result = await platform.initiateLogin({
    linkId: "link-1",
    currentUserId: "123",
  });
  expect(result).toStrictEqual({ type: "error", status: 500 });
  expect(saved.length).toBe(0);
});
