import {
  CONTEXT_ROLES,
  createPlatform,
  type LaunchStore,
  type Link,
  type LinkStore,
  type Tool,
  type UserStore,
} from "../../src/index.js";

export const tool = {
  clientId: "client-1",
  deploymentIds: ["deployment-1"],
  oidcLoginInitiationUrl: "https://tool.example.com/lti/login",
  targetLinkUri: "https://tool.example.com/lti/launch",
  redirectUris: ["https://tool.example.com/lti/launch"],
};

export const link = {
  linkId: "link-1",
  clientId: "client-1",
  deploymentId: "deployment-1",
  context: {
    id: "course-1",
  },
};

export const user = {
  userId: "123",
};

export const makePlatform = (
  overrides: {
    tool?: Tool;
    link?: Link;
    launches?: LaunchStore;
    users?: UserStore;
    links?: LinkStore;
  } = {},
) => {
  const platformTool: Tool = overrides.tool ?? tool;
  const platformLink: Link = overrides.link ?? link;
  const platformLaunches: LaunchStore = overrides.launches ?? {
    save: async () => {},
  };
  const platformUsers: UserStore = overrides.users ?? {
    findUser: async (userId) => (userId === user.userId ? user : undefined),
    getRoles: async (userId, contextId) =>
      userId === user.userId && contextId === link.context.id
        ? [CONTEXT_ROLES.Learner]
        : [],
  };
  const platformLinks: LinkStore = overrides.links ?? {
    findLink: async (linkId) =>
      linkId === platformLink.linkId ? platformLink : undefined,
  };
  return createPlatform({
    issuer: "http://localhost:4000",
    registrations: {
      findByClientId: async (clientId) =>
        clientId === platformTool.clientId ? platformTool : undefined,
    },
    links: platformLinks,
    launches: platformLaunches,
    users: platformUsers,
  });
};
