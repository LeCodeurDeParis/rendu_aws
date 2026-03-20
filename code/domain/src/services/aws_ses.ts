import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
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

/** Envoyé après acceptation de l'invitation dans l'appli (pas d'email à la création). */
export async function sendInvitationAcceptedConfirmationEmail(
  to: string,
  teamName: string
): Promise<void> {
  const html = loadTemplate("invitation_confirmation", { teamName });

  await client.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: `Trellu — invitation dans l'équipe ${teamName}` },
        Body: { Html: { Data: html } },
      },
    })
  );
}
