import { KeycloakConfig } from "../lib/keycloak-auth";

export const keycloakConfig: KeycloakConfig = {
  url: "http://localhost:1111",
  realm: "dev",
  clientId: "fbp",
};

export const KEYCLOAK_CLIENT_SECRET = "yQJX4vRvoeYaJi0ZifiGLc7itniEfZZB";
export const REDIRECT_URI = window.location.origin;