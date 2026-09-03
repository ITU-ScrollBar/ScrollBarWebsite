const fs = require('node:fs');
const path = require('node:path');
const FormData = require('form-data');

const mailgunModule = require('mailgun.js');
const Mailgun = mailgunModule.default || mailgunModule;

// Uploads an email template from functions/templates to Mailgun, so the HTML lives in this repo
// instead of only in the Mailgun visual editor. Creates the template on the first run and adds a
// new active version on later runs.
//
//   node scripts/upload-email-template.js [--name <template>] [--file <path>] [--dry-run]
//
// MAILGUN_DOMAIN is read from the environment, falling back to functions/.env (the same file the
// deploy workflow writes). Reusing it is deliberate: Mailgun scopes templates per domain, so this
// guarantees the template lands on the domain mailservice.ts sends from. Templates are shared
// across envs, so an upload affects dev and prod alike.
//
// The key comes from MAILGUN_ADMIN_API_KEY, falling back to MAILGUN_API_KEY. They are separate on
// purpose: a domain sending key only permits POST /messages, so template CRUD needs an Account API
// key. Keep the deployed MAILGUN_API_KEY a sending key and supply the account key only when
// running this script, rather than giving the functions full account access.

const defaultTemplateName = 'ticket_created_template';
const templatesDir = path.join(__dirname, '..', 'templates');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const parseArgs = (argv) => {
  const args = { name: null, file: null, dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--name' || arg === '--file') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        fail(`${arg} requires a value`);
      }
      args[arg === '--name' ? 'name' : 'file'] = value;
      i += 1;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  // A --file without a --name would otherwise upload unrelated HTML under the default template
  // name, so derive the name from the file instead.
  if (!args.name) {
    args.name = args.file
      ? path.basename(args.file, path.extname(args.file))
      : defaultTemplateName;
  }

  return args;
};

// Minimal .env reader; functions/.env is a flat KEY=value file written by the deploy workflow.
const readEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const parsed = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) {
      continue;
    }
    const value = match[2];
    // Only strip quotes when the value is wrapped in a matching pair.
    const quoted = /^"(.*)"$/.exec(value) || /^'(.*)'$/.exec(value);
    parsed[match[1]] = quoted ? quoted[1] : value;
  }
  return parsed;
};

// Second resolution alone collides when two uploads land in the same second, and Mailgun rejects
// a duplicate tag, so add a short random suffix.
const buildVersionTag = () => {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `v${stamp}${suffix}`;
};

const templateExists = async (templates, domain, name) => {
  try {
    await templates.get(domain, name);
    return true;
  } catch (error) {
    if (error?.status === 404) {
      return false;
    }
    throw error;
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const file = args.file
    ? path.resolve(args.file)
    : path.join(templatesDir, `${args.name}.html`);

  if (!fs.existsSync(file)) {
    fail(`Template file not found: ${file}`);
  }

  const html = fs.readFileSync(file, 'utf8');
  if (!html.trim()) {
    fail(`Template file is empty: ${file}`);
  }

  const envFile = readEnvFile();
  const apiKey = (
    process.env.MAILGUN_ADMIN_API_KEY ||
    process.env.MAILGUN_API_KEY ||
    envFile.MAILGUN_ADMIN_API_KEY ||
    envFile.MAILGUN_API_KEY ||
    ''
  ).trim();
  const domain = (process.env.MAILGUN_DOMAIN || envFile.MAILGUN_DOMAIN || '').trim();

  if (!domain) {
    fail('MAILGUN_DOMAIN is not set. Export it or add it to functions/.env before uploading.');
  }

  console.log(`Template: ${args.name}`);
  console.log(`Domain:   ${domain}`);
  console.log(`Source:   ${file} (${html.length} chars)`);

  if (args.dryRun) {
    console.log('Dry run - nothing was sent to Mailgun.');
    return;
  }

  if (!apiKey) {
    fail(
      'No Mailgun key found. Set MAILGUN_ADMIN_API_KEY to an Account API key (a domain sending ' +
        'key cannot manage templates) and re-run.'
    );
  }

  const mailgun = new Mailgun(FormData).client({
    username: 'api',
    key: apiKey,
    url: 'https://api.eu.mailgun.net',
  });
  const templates = mailgun.domains.domainTemplates;
  const tag = buildVersionTag();
  const comment = `Uploaded from functions/templates by upload-email-template.js`;

  if (await templateExists(templates, domain, args.name)) {
    await templates.createVersion(domain, args.name, {
      template: html,
      tag,
      engine: 'handlebars',
      active: 'yes',
      comment,
    });
    console.log(`Added active version ${tag} to existing template "${args.name}".`);
    return;
  }

  await templates.create(domain, {
    name: args.name,
    description: `Source: functions/templates/${args.name}.html`,
    template: html,
    tag,
    engine: 'handlebars',
    comment,
  });
  console.log(`Created template "${args.name}" with active version ${tag}.`);
};

main().catch((error) => {
  console.error('Template upload failed:', error?.message || error);
  if (error?.details) {
    console.error(error.details);
  }
  if (error?.status === 401 || error?.status === 403) {
    console.error(
      'Hint: template management requires an Account API key. A domain sending key is only ' +
        'permitted to POST /messages.'
    );
  }
  process.exitCode = 1;
});
