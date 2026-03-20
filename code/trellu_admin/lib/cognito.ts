"use client";

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

let userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool | null {
  if (userPool) return userPool;
  const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!poolId || !clientId) return null;
  userPool = new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId });
  return userPool;
}

export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  const pool = getUserPool();
  if (!pool) return Promise.reject(new Error("Cognito not configured"));
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
      newPasswordRequired: (userAttributes) => {
        delete userAttributes.email_verified;
        delete userAttributes.email;
        cognitoUser.completeNewPasswordChallenge(password, userAttributes, {
          onSuccess: (session) => resolve(session),
          onFailure: (err) => reject(err),
        });
      },
    });
  });
}

export function signOut(): void {
  const pool = getUserPool();
  if (pool) {
    const user = pool.getCurrentUser();
    if (user) user.signOut();
  }
}

export function getSession(): Promise<CognitoUserSession | null> {
  const pool = getUserPool();
  if (!pool) return Promise.resolve(null);
  return new Promise((resolve) => {
    const user = pool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session);
    });
  });
}

export function getToken(): Promise<string | null> {
  return getSession().then((session) => session?.getIdToken().getJwtToken() ?? null);
}
