import {
  SESClient,
  SendEmailCommand,
  MessageRejected,
  MailFromDomainNotVerifiedException,
  FromEmailAddressNotVerifiedException,
  LimitExceededException,
  ProductionAccessNotGrantedException,
  SESServiceException,
} from "@aws-sdk/client-ses";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const client = new SESClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "noreply@trellu.app";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Erreur locale (fichier manquant) — distinguable des erreurs AWS par `instanceof`. */
export class EmailTemplateMissingError extends Error {
  readonly templateName: string;
  constructor(templateName: string, lambdaPath: string, localPath: string) {
    super(
      `Email template "${templateName}" not found (Lambda: ${lambdaPath}, local: ${localPath})`
    );
    this.name = "EmailTemplateMissingError";
    this.templateName = templateName;
  }
}

function loadTemplate(name: string, variables: Record<string, string>): string {
  const lambdaPath = resolve("/var/task/emails", `${name}.html`);
  const localPath = resolve(__dirname, "../../../emails", `${name}.html`);
  const templatePath = existsSync(lambdaPath) ? lambdaPath : localPath;
  if (!existsSync(templatePath)) {
    throw new EmailTemplateMissingError(name, `/var/task/emails/${name}.html`, localPath);
  }
  let html = readFileSync(templatePath, "utf-8");
  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

export async function sendInvitationEmail(
  to: string,
  teamName: string,
  inviterName: string,
  acceptUrl: string
): Promise<void> {
  const html = loadTemplate("invitation", { teamName, inviterName, acceptUrl });

  await client.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: `Invitation à rejoindre l'équipe ${teamName}` },
        Body: { Html: { Data: html } },
      },
    })
  );
}

const MSG_TEMPLATE =
  "L'email n'a pas été envoyé : template introuvable sur le serveur.";
const MSG_SANDBOX_IDENTITE =
  "L'email n'a pas été envoyé : en mode bac à sable SES, l'expéditeur et le destinataire doivent être vérifiés.";
const MSG_PRODUCTION_ACCESS =
  "L'email n'a pas été envoyé : le compte SES n'a pas encore l'accès à l'envoi en production.";
const MSG_LIMIT =
  "L'email n'a pas été envoyé : quota ou limite SES atteinte. Réessayez plus tard.";
const MSG_PERMISSION =
  "L'email n'a pas été envoyé : permission SES manquante sur le rôle Lambda.";
const MSG_THROTTLE =
  "L'email n'a pas été envoyé : limite SES temporairement atteinte. Réessayez plus tard.";
const MSG_DEFAULT =
  "L'invitation est enregistrée mais l'email n'a pas pu être envoyé. Vérifiez SES (expéditeur, sandbox, logs CloudWatch).";

/** Erreurs SES modélisées par le SDK — ordre : du plus spécifique au plus générique côté instanceof. */
const SES_EXCEPTION_MESSAGES: ReadonlyArray<
  readonly [new (...args: never[]) => object, string]
> = [
  [MessageRejected, MSG_SANDBOX_IDENTITE],
  [MailFromDomainNotVerifiedException, MSG_SANDBOX_IDENTITE],
  [FromEmailAddressNotVerifiedException, MSG_SANDBOX_IDENTITE],
  [ProductionAccessNotGrantedException, MSG_PRODUCTION_ACCESS],
  [LimitExceededException, MSG_LIMIT],
];

/** Erreurs portées uniquement par `name` sur `SESServiceException` (IAM, throttling réseau, etc.). */
const SES_SERVICE_NAME_MESSAGES: Readonly<Record<string, string>> = {
  AccessDenied: MSG_PERMISSION,
  AccessDeniedException: MSG_PERMISSION,
  ThrottlingException: MSG_THROTTLE,
  TooManyRequestsException: MSG_THROTTLE,
};

/**
 * Résolution par pipeline : pas de `switch` ni de chaîne de `if` — `instanceof` sur les classes du SDK
 * puis recherche par `name` pour les cas génériques.
 */
const RESOLVERS: ReadonlyArray<(err: unknown) => string | undefined> = [
  (err) => (err instanceof EmailTemplateMissingError ? MSG_TEMPLATE : undefined),
  (err) => SES_EXCEPTION_MESSAGES.find(([Ctor]) => err instanceof Ctor)?.[1],
  (err) =>
    err instanceof SESServiceException ? SES_SERVICE_NAME_MESSAGES[err.name] : undefined,
];

/** Message utilisateur lorsque `sendInvitationEmail` échoue (`catch` reçoit `unknown`). */
export function invitationEmailFailureMessage(err: unknown): string {
  return (
    RESOLVERS.map((resolve) => resolve(err)).find((msg) => msg !== undefined) ?? MSG_DEFAULT
  );
}
