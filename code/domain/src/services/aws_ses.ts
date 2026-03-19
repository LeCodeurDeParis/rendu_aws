import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const client = new SESClient({
  region: process.env.AWS_REGION ?? "eu-west-1",
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "noreply@trellu.app";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadTemplate(name: string, variables: Record<string, string>): string {
  const lambdaPath = resolve("/var/task/emails", `${name}.html`);
  const localPath = resolve(__dirname, "../../../emails", `${name}.html`);
  const templatePath = existsSync(lambdaPath) ? lambdaPath : localPath;
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
