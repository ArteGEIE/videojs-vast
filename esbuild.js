const esbuild = require('esbuild');
const package = require('./package.json')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const debug = false
const buildConfig = package.config.build

if (!buildConfig) {
	throw 'the package.json should have a `config.build` field'
}


const argv = yargs(hideBin(process.argv))
	.usage('Usage: $0 -t [module-type]')
	.demandOption(['t'])
	.alias('t', 'module-type')
	.describe('t', 'set the provided module type to the bsconfig')
	.choices('t', ['es6', 'commonjs'])
	.help('help')
	.argv;

const format = argv.t === "commonjs" ? "cjs" : "es6"
const configByFormat = format === "cjs" ? {
	format: "cjs",
	outdir: buildConfig.cjs.outdir

} : {
	outdir: buildConfig.mjs.outdir,
	outExtension: { '.js': buildConfig.mjs.extension },
	format: "esm",
	splitting: true
};

const externalDeps = [
	...Object.keys(package.dependencies),
	...Object.keys(package.peerDependencies)
]
if (debug) {
	console.log(externalDeps)
}

const entryPoints = Object.values(buildConfig.entries);

esbuild
	.build({
		entryPoints,
		external: externalDeps,
		define: { "process.env.NODE_ENV": "'production'" },
		loader: { '.js': 'jsx' },
		bundle: true,
		minify: false,
		sourcemap: true,
		...configByFormat
	})
	.catch(() => process.exit(1));