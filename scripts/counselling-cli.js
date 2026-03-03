#!/usr/bin/env node

import { Command } from "commander";
import { importCutoffs } from "./core/importer.js";

const program = new Command();

program
  .name("counselling-cli")
  .description("Production CLI for counselling dataset import")
  .version("1.0.0");

program
  .command("import-cutoffs")
  .requiredOption("--collection <name>")
  .requiredOption("--file <path>")
  .action(async (opts) => {
    await importCutoffs(opts.collection, opts.file);
  });

program.parse();