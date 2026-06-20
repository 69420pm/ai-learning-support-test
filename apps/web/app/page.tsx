import { core } from "@ai-learning-support/core";
import { redirect } from "next/navigation";

export default function Page() {
	redirect("/dashboard");

	return (
		<main>
			<h1>Hello World</h1>
			<p>{core()}</p>
		</main>
	);
}

