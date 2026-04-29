#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import { login } from "./auth.js";
import { getCredentials, clearCredentials } from "./config.js";
import {
  listProfiles,
  getProfile,
  deleteProfile,
  searchProfiles,
  exportProfiles,
  whoami,
} from "./api.js";

const program = new Command();

program
  .name("insighta")
  .description("Insighta Labs+ CLI — Profile Intelligence Tool")
  .version("1.0.0");

// ─── AUTH ────────────────────────────────────────────────────

program
  .command("login")
  .description("Authenticate via GitHub OAuth (opens browser)")
  .action(async () => {
    const spinner = ora("Starting GitHub OAuth flow...").start();
    try {
      await login();
      const creds = getCredentials();
      spinner.succeed(chalk.green(`Logged in as ${creds?.user.name} (${creds?.user.role})`));
      // Add a small delay so the node process can exit cleanly
      setTimeout(() => process.exit(0), 100);
    } catch (err: any) {
      spinner.fail(chalk.red(`Login failed: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(() => {
    clearCredentials();
    console.log(chalk.yellow("Logged out. Credentials cleared."));
  });

program
  .command("whoami")
  .description("Show current authenticated user")
  .action(async () => {
    const user = await whoami();
    if (!user) {
      console.log(chalk.red("Not logged in. Run: insighta login"));
      return;
    }
    console.log(chalk.bold(`Name: ${user.name}`));
    console.log(`Role: ${user.role}`);
    console.log(`ID:   ${user.id}`);
  });

// ─── PROFILES ───────────────────────────────────────────────

program
  .command("profiles")
  .description("List profiles with optional filters")
  .option("-p, --page <page>", "Page number", "1")
  .option("-l, --limit <limit>", "Results per page", "20")
  .option("-g, --gender <gender>", "Filter by gender (male/female)")
  .option("-a, --age-group <group>", "Filter by age group (child/teenager/adult/senior)")
  .option("-s, --sort <field>", "Sort by field (created_at/age/gender_probability)")
  .option("-o, --order <order>", "Sort order (asc/desc)", "desc")
  .action(async (opts) => {
    const spinner = ora("Fetching profiles...").start();
    try {
      const params: Record<string, string> = {
        page: opts.page,
        limit: opts.limit,
      };
      if (opts.gender) params.gender = opts.gender;
      if (opts.ageGroup) params.age_group = opts.ageGroup;
      if (opts.sort) params.sort_by = opts.sort;
      if (opts.order) params.order = opts.order;

      const result = await listProfiles(params);
      spinner.stop();

      if (result.data?.length === 0) {
        console.log(chalk.yellow("No profiles found."));
        return;
      }

      // Table header
      console.log(
        chalk.bold.underline(
          `${"Name".padEnd(20)} ${"Gender".padEnd(8)} ${"Age".padEnd(6)} ${"Country".padEnd(15)} ${"Confidence".padEnd(12)}`
        )
      );

      for (const p of result.data) {
        const conf = `${Math.round(p.gender_probability * 100)}%`;
        console.log(
          `${p.name.padEnd(20)} ${p.gender.padEnd(8)} ${String(p.age).padEnd(6)} ${(p.country_name || p.country_id).padEnd(15)} ${conf.padEnd(12)}`
        );
      }

      // Pagination info
      if (result.pagination) {
        const { pagination } = result;
        console.log(
          chalk.dim(`\nPage ${pagination.page}/${Math.ceil(pagination.total / pagination.limit)} — ${pagination.total} total`)
        );
      }
    } catch (err: any) {
      spinner.fail(chalk.red(err.message));
    }
  });

program
  .command("profile <id>")
  .description("Get a specific profile by ID")
  .action(async (id) => {
    const spinner = ora("Fetching profile...").start();
    try {
      const result = await getProfile(id);
      spinner.stop();
      console.log(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      spinner.fail(chalk.red(err.message));
    }
  });

program
  .command("delete <id>")
  .description("Delete a profile (admin only)")
  .action(async (id) => {
    const spinner = ora("Deleting profile...").start();
    try {
      await deleteProfile(id);
      spinner.succeed(chalk.green("Profile deleted."));
    } catch (err: any) {
      spinner.fail(chalk.red(err.message));
    }
  });

// ─── SEARCH ─────────────────────────────────────────────────

program
  .command("search <query...>")
  .description('Natural language search (e.g. "men from Nigeria over 30")')
  .action(async (queryParts) => {
    const query = queryParts.join(" ");
    const spinner = ora(`Searching: "${query}"...`).start();
    try {
      const result = await searchProfiles(query);
      spinner.stop();

      if (!result.data?.length) {
        console.log(chalk.yellow("No results found."));
        return;
      }

      console.log(chalk.bold(`${result.data.length} results:\n`));
      for (const p of result.data) {
        console.log(
          `  ${chalk.bold(p.name)} — ${p.gender}, age ${p.age} — ${p.country_name || p.country_id}`
        );
      }
    } catch (err: any) {
      spinner.fail(chalk.red(err.message));
    }
  });

// ─── EXPORT ─────────────────────────────────────────────────

program
  .command("export")
  .description("Export all profiles to CSV (admin only)")
  .option("-o, --output <file>", "Output file path", "profiles_export.csv")
  .action(async (opts) => {
    const spinner = ora("Exporting profiles...").start();
    try {
      const csv = await exportProfiles();
      fs.writeFileSync(opts.output, csv);
      spinner.succeed(chalk.green(`Exported to ${opts.output}`));
    } catch (err: any) {
      spinner.fail(chalk.red(err.message));
    }
  });

program.parse();
