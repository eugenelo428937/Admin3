import type { Config } from "jest";
import path from "path";

const config: Config = {
	reporters: [
		"default",
		[
			"tdd-guard-jest",
			{
				projectRoot: path.resolve(__dirname),
			},
		],
	],
};

export default config;
