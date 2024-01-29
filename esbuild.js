const esbuild = require('esbuild');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const pkg = require('./package.json');

const debug = false;
const buildConfig = pkg.config.build;

if (!buildConfig) {
  throw new Error('the package.json should have a `config.build` field');
}

const { argv } = yargs(hideBin(process.argv))
  .usage('Usage: $0 -t [module-type]')
  .demandOption(['t'])
  .alias('t', 'module-type')
  .describe('t', 'set the provided module type to the bsconfig')
  .choices('t', ['es6', 'commonjs'])
  .help('help');

const format = argv.t === 'commonjs' ? 'cjs' : 'es6';
const configByFormat = format === 'cjs' ? {
  format: 'cjs',
  outdir: buildConfig.cjs.outdir,
} : {
  outdir: buildConfig.mjs.outdir,
  outExtension: { '.js': buildConfig.mjs.extension },
  format: 'esm',
  splitting: true,
  target: ['es2020', 'safari11'],
};

const externalDeps = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];
if (debug) {
  console.log(externalDeps);
}

const entryPoints = Object.values(buildConfig.entries);

esbuild
  .build({
    entryPoints,
    external: externalDeps,
    define: { 'process.env.NODE_ENV': "'production'" },
    loader: { '.js': 'jsx' },
    bundle: true,
    minify: false,
    sourcemap: true,
    ...configByFormat,
  })
  .catch(() => process.exit(1));
