const LTI = "https://purl.imsglobal.org/spec/lti/claim/";

// LTI claims of the id_token, LTI 1.3 Core 5.3:
// https://www.imsglobal.org/spec/lti/v1p3/#required-message-claims
export const LTI_CLAIMS = {
  MessageType: `${LTI}message_type`,
  Version: `${LTI}version`,
  DeploymentId: `${LTI}deployment_id`,
  TargetLinkUri: `${LTI}target_link_uri`,
  ResourceLink: `${LTI}resource_link`,
  Context: `${LTI}context`,
  Roles: `${LTI}roles`,
} as const;
