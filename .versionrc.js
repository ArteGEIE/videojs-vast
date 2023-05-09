const semver = require('semver');
const { argv } = require('yargs');
// Standard version confiuration file
// https://github.com/conventional-changelog/standard-version
//
// Gitflow detailed here:
// https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow
//
// Retrieve current package version
const { version } = require('./package.json');


// Check if the github username and token are defined
const githubUsername = process.env.GITHUB_USERNAME;
const githubToken = process.env.GITHUB_USER_TOKEN;
if (githubUsername === undefined || githubToken === undefined) {
    console.error('Env variable GITHUB_USERNAME or GITHUB_USER_TOKEN not found');
    process.exit(1);
}

const releaseType = argv['release-as'];
let nextVersion = argv['release-as'];

const finalVersion = semver.valid(semver.coerce(nextVersion));
const isPrerelease = semver.prerelease(nextVersion) !== null;
const releaseBranch = `release/${nextVersion}`;
const oneLiner = (separator = '') => (commands = []) => commands.filter(Boolean).join(separator);

console.log('------------------------------------------------------------');
console.log('------------------------------------------------------------');
console.log('!!! Published version will be', nextVersion, '!!!');
console.log('------------------------------------------------------------');
console.log('------------------------------------------------------------');
console.log('current version:',version,'nextVersion:',nextVersion,'finalVersion:', finalVersion, 'isPrerelease:',isPrerelease,'releaseBranch:',releaseBranch);
console.log('------------------------------------------------------------');
console.log('------------------------------------------------------------\n\n\n');

const config = () => ({
  // Tags are prefixed with v by default.
  // To prefix tag with something else, use -t flag.
  t: '',
  // need to list all files due to a bug in standard-version (https://github.com/conventional-changelog/standard-version/issues/533)
  bumpFiles: [{
    filename: 'package.json',
    type: 'json'
  }],
  scripts: {
    prerelease: oneLiner(' && ')([
      `git checkout ${releaseBranch}`,
      `git fetch origin`,
      // now checking code
      'npm ci',
      'npm run lint',
      'npm run build',
      'npm run bundle:demo',
      'npm run test',
    ]),
    postbump: oneLiner(' && ')([
      'git add ./package*.json',
      'git add package-lock.json',
      'git add docs/demo.js',
      'git add docs/demo.js.map',
      isPrerelease ? '' : 'npm run ci:changelog',
      isPrerelease ? '' : 'git add ./CHANGELOG.md',
      `git commit -m "chore(${isPrerelease ? 'pre' : ''}release): ${nextVersion}"`,
      // now checking conflicts
      isPrerelease ? '' : 'git checkout develop',
      isPrerelease ? '' : 'git fetch origin',
      isPrerelease ? '' : `git merge --no-commit --no-ff ${releaseBranch}`,
      isPrerelease ? '' : 'git merge --abort',
      isPrerelease ? '' : 'git checkout master',
      isPrerelease ? '' : 'git fetch origin',
      isPrerelease ? '' : `git merge --no-commit --no-ff ${releaseBranch}`,
      isPrerelease ? '' : 'git merge --abort',
      isPrerelease ? '' : `git checkout ${releaseBranch}`,
      'npm publish',
      `git push origin HEAD:${releaseBranch}`,

      // <-- RELEASE ONLY, WE CAN MERGE DELETE BRANCHES AND TAG
      // checkout master
      isPrerelease ? '' : `git checkout master`,
      // merge release into master
      isPrerelease ? '' : `git merge ${releaseBranch}`,
      // push master (will merge the PR)
      isPrerelease ? '' : 'git push origin HEAD',
      // return back to master to send tag at the end
      isPrerelease ? '' : `git checkout master`,
      // delete local branch
      isPrerelease ? '' : `git branch -D ${releaseBranch}`,
      // delete remote branch
      isPrerelease ? '' : `git push origin --delete ${releaseBranch}`,
    ]),
    // posttag is skipped for prereleases
    posttag: oneLiner(' && ')([
      // push tag
      `git push origin ${nextVersion}`,
      'npm run github_release',
      // merge back in develop at the very end of the process
      'git checkout develop',
      'git merge master',
      'git push origin HEAD',
    ]),
  },
  skip: {
    changelog: true,
    commit: true,
    tag: isPrerelease ? true : false
  },
});

module.exports = config;
