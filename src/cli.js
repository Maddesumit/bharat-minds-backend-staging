import { importEngineeringCutoffs } from "./importers/cutoffImporter.js";
import { importHKCutoffs } from "./importers/hkImporter.js";
import { importSeatMatrix } from "./importers/seatMatrixImporter.js";
import { importColleges } from "./importers/collegesImporter.js";

const cmd = process.argv[2];

async function run() {

  switch (cmd) {

    case "r1":
      await importEngineeringCutoffs("data/r1_cutoffs.csv", 1, "r1_cutoffs");
      break;

    case "r2":
      await importEngineeringCutoffs("data/r1r2_hk_cutoff.csv", 2, "r1r2_hk_cutoff");
      break;

    case "hk":
      await importHKCutoffs("data/r1r2_hk.csv", "r1r2_hk");
      break;

    case "seats":
      await importSeatMatrix("data/Seat_Matrix.csv");
      break;

    case "colleges":
      await importColleges("data/colleges_info.csv");
      break;

    case "all":
      await importEngineeringCutoffs("data/r1_cutoffs.csv", 1, "r1_cutoffs");
      await importEngineeringCutoffs("data/r1r2_hk_cutoff.csv", 2, "r1r2_hk_cutoff");
      await importHKCutoffs("data/r1r2_hk.csv", "r1r2_hk");
      await importSeatMatrix("data/Seat_Matrix.csv");
      await importColleges("data/colleges_info.csv");
      break;

    default:
      console.log(`
Usage:

node src/cli.js r1
node src/cli.js r2
node src/cli.js hk
node src/cli.js seats
node src/cli.js colleges
node src/cli.js all
`);
  }
}

run();