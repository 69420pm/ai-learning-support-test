import { Command } from "commander";

const program = new Command();

program.name("my-tool").description("A professional CLI tool").version("1.0.0");

program.command("run").action(() => {
	const result = "123";
	console.log(`Core says: ${result}`);
});
program.parse();
