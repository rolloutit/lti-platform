const MEMBERSHIP = "http://purl.imsglobal.org/vocab/lis/v2/membership#";

// Context (membership) roles, LTI 1.3 Core A.2.3:
// https://www.imsglobal.org/spec/lti/v1p3/#lis-vocabulary-for-context-roles
// UserStore.getRoles returns these full URIs, they go into the roles claim.
export const CONTEXT_ROLES = {
  Administrator: `${MEMBERSHIP}Administrator`,
  ContentDeveloper: `${MEMBERSHIP}ContentDeveloper`,
  Instructor: `${MEMBERSHIP}Instructor`,
  Learner: `${MEMBERSHIP}Learner`,
  Mentor: `${MEMBERSHIP}Mentor`,
  Manager: `${MEMBERSHIP}Manager`,
  Member: `${MEMBERSHIP}Member`,
  Officer: `${MEMBERSHIP}Officer`,
} as const;
