"use client";

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
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

export function signUp(email: string, password: string, name: string): Promise<void> {
  const pool = getUserPool();
  if (!pool) return Promise.reject(new Error("Cognito not configured"));
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "name", Value: name }),
    ];
    pool.signUp(email, password, attributes, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  const pool = getUserPool();
  if (!pool) return Promise.reject(new Error("Cognito not configured"));
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function resendConfirmationCode(email: string): Promise<void> {
  const pool = getUserPool();
  if (!pool) return Promise.reject(new Error("Cognito not configured"));
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    cognitoUser.resendConfirmationCode((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
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

export function getCurrentUser() {
  const pool = getUserPool();
  return pool ? pool.getCurrentUser() : null;
}
