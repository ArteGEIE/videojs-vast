const fs = require('fs');

const transforms = {
  transformSmartCommits: () => {
    const matcher = /\(([A-Z]+-[0-9]+)\)/g;
    const buffer = fs.readFileSync('./CHANGELOG.md', 'utf8');
    return buffer.replace(
      matcher,
      '([$1](https://artetv.atlassian.net/browse/$1))',
    );
  },
};

if (process.argv.includes('--transform')) {
  const transformed = transforms.transformSmartCommits();
  fs.writeFileSync('./CHANGELOG.md', transformed);
}

module.exports = {
  writerOpts: {
    headerPartial: `<a name="{{version}}"></a>
{{#if isPatch~}}
  ##
{{~else~}}
  #
{{~/if}} [{{version}}](#{{version}})
  {{~#if title}} "{{title}}"
  {{~/if}}
  {{~#if date}} ({{date}})
  {{~/if}}

`,
    commitPartial: `* {{header}}

{{~!-- commit link --}} {{#if @root.linkReferences~}}
  ([{{hash}}](
  {{~#if @root.repository}}
    {{~#if @root.host}}
      {{~@root.host}}/
    {{~/if}}
    {{~#if @root.owner}}
      {{~@root.owner}}/
    {{~/if}}
    {{~@root.repository}}
  {{~else}}
    {{~@root.repoUrl}}
  {{~/if}}/
  {{~@root.commit}}/{{hash}}))
{{~else}}
  {{~hash}}
{{~/if}}

{{~!-- commit references --}}
{{~#if references~}}
  , closes
  {{~#each references}} {{#if @root.linkReferences~}}
    [
    {{~#if this.owner}}
      {{~this.owner}}/
    {{~/if}}
    {{~this.repository}}#{{this.issue}}](
    {{~#if @root.repository}}
      {{~#if @root.host}}
        {{~@root.host}}/
      {{~/if}}
      {{~#if this.repository}}
        {{~#if this.owner}}
          {{~this.owner}}/
        {{~/if}}
        {{~this.repository}}
      {{~else}}
        {{~#if @root.owner}}
          {{~@root.owner}}/
        {{~/if}}
          {{~@root.repository}}
        {{~/if}}
    {{~else}}
      {{~@root.repoUrl}}
    {{~/if}}/
    {{~@root.issue}}/{{this.issue}})
  {{~else}}
    {{~#if this.owner}}
      {{~this.owner}}/
    {{~/if}}
    {{~this.repository}}#{{this.issue}}
  {{~/if}}{{/each}}
{{~/if}}


`,
  },
};
