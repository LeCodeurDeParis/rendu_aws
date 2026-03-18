import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { CognitoUser } from "../types/index.js";

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

function parseAttributes(attrs: { Name?: string; Value?: string }[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of attrs ?? []) {
    if (attr.Name && attr.Value) {
      result[attr.Name] = attr.Value;
    }
  }
  return result;
}

export async function getUserBySub(sub: string): Promise<CognitoUser | null> {
  try {
    const res = await client.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: sub,
      })
    );
    const attrs = parseAttributes(res.UserAttributes);
    return {
      sub: attrs["sub"] ?? sub,
      email: attrs["email"] ?? "",
      name: attrs["name"] ?? "",
      role: attrs["custom:role"] ?? "user",
    };
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<CognitoUser | null> {
  const res = await client.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    })
  );
  const user = res.Users?.[0];
  if (!user) return null;

  const attrs = parseAttributes(user.Attributes);
  return {
    sub: attrs["sub"] ?? "",
    email: attrs["email"] ?? "",
    name: attrs["name"] ?? "",
    role: attrs["custom:role"] ?? "user",
  };
}

export async function updateUserBySub(sub: string, data: { name?: string; role?: string }): Promise<void> {
  const attributes: { Name: string; Value: string }[] = [];
  if (data.name) attributes.push({ Name: "name", Value: data.name });
  if (data.role) attributes.push({ Name: "custom:role", Value: data.role });

  if (attributes.length === 0) return;

  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: sub,
      UserAttributes: attributes,
    })
  );
}

export async function listUsers(): Promise<CognitoUser[]> {
  const users: CognitoUser[] = [];
  let paginationToken: string | undefined;

  do {
    const res = await client.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        PaginationToken: paginationToken,
      })
    );
    for (const user of res.Users ?? []) {
      const attrs = parseAttributes(user.Attributes);
      users.push({
        sub: attrs["sub"] ?? "",
        email: attrs["email"] ?? "",
        name: attrs["name"] ?? "",
        role: attrs["custom:role"] ?? "user",
      });
    }
    paginationToken = res.PaginationToken;
  } while (paginationToken);

  return users;
}

export async function isAdmin(sub: string): Promise<boolean> {
  const user = await getUserBySub(sub);
  return user?.role === "admin";
}
