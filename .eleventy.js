const fs = require('fs');

/**
 * Get the list of known LOB extensions.
 */
function getLobExtensions() {
  const lines = fs.readFileSync('site/.gitignore', 'utf-8').split(/\r?\n/);
  const start = lines.indexOf('# start_lob_ignore') + 1;
  const end = lines.indexOf('# end_lob_ignore') - 1;
  return lines.slice(start, end)
    .filter((x) => x.length && !x.startsWith('#'))
    .map((x) => x.slice(1));
}

/**
 * Add optional line break opportunities after slashes in normal text to
 * prevent overflow and let long strings wrap at natural boundaries.
 */
function addSlashBreakOpportunities(mdlib) {
  // Match slash boundaries between non-whitespace characters so paths and
  // similar strings can wrap without adding breaks around standalone slashes.
  const slashBreakPattern = /(?<=[^\s\/]\/)(?=[^\s\/])/;

  // Track entry into and exit from HTML elements whose contents must remain
  // verbatim so we don't insert <wbr> inside code or raw-text content.
  function getVerbatimDepthChange(html) {
    const tag = html.match(
      /^<\s*(\/?)\s*(code|pre|script|style|textarea)(?=[\s\/>])/i);
    if (!tag) {
      return 0;
    }
    return tag[1] ? -1 : 1;
  }

  function splitTextToken(state, token) {
    const pieces = token.content.split(slashBreakPattern);
    if (pieces.length === 1) {
      return [token];
    }

    // Rebuild the text token as alternating text and <wbr> tokens at eligible
    // slash boundaries.
    return pieces.flatMap((content, index) => {
      const text = new state.Token('text', '', 0);
      text.content = content;
      text.level = token.level;
      let tokens = [text];

      if (index < pieces.length - 1) {
        const wordBreak = new state.Token('html_inline', '', 0);
        wordBreak.content = '<wbr>';
        wordBreak.level = token.level;
        tokens.push(wordBreak);
      }

      return tokens;
    });
  }

  mdlib.core.ruler.push('slash_break_opportunities', state => {
    for (const blockToken of state.tokens) {
      if (!blockToken.children) {
        continue;
      }

      const children = [];
      let verbatimDepth = 0;
      // Rewrite ordinary text tokens while preserving HTML tokens and any text
      // inside verbatim elements.
      for (const token of blockToken.children) {
        if (token.type === 'html_inline') {
          children.push(token);
          verbatimDepth = Math.max(
            0, verbatimDepth + getVerbatimDepthChange(token.content));
        } else if (token.type === 'text' && verbatimDepth === 0) {
          children.push(...splitTextToken(state, token));
        } else {
          children.push(token);
        }
      }
      blockToken.children = children;
    }
  });
}

module.exports = config => {
  config.addWatchTarget('./site/_stylesheets/');

  // `markdown-it` is Eleventy's default Markdown rendering engine.
  // We need a reference to it to customize its behavior, below.
  const md = require('markdown-it');

  // `markdown-it-anchor` is an Eleventy plugin that will add <a> tags to header elements.
  // (this improves the accessibility of linking to headers.)
  const anchor = require('markdown-it-anchor');

  // `uslug` is a Node package that convert text strings into "slugs" in a
  // Unicode-friendly way. (Slugs are the kebab-cased equivalents of text that
  // we use for page names, id's, etc. "Hello world" turns into 'hello-world".
  const uslug = require('uslug');

  // `highlight.js` is a Node package that does syntax highlighting.
  const hljs = require('highlight.js');

  // `markdown-it-attrs` is a markdown-it plugin that lets us customize the
  // `id` and `class` attributes of an element in the generated output;
  // we use this mostly for customizing the links in header tags.
  //
  // `markdown-it-toc-done-right` is a markdown-it plugin that adds support
  // for the `[TOC]` mechanism for generating the table of contents in a page.
  let mdlib = md({
    highlight: (str, lang) => {
      if (lang) {
        if (hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, {language: lang}).value;
          } catch (_) {}
        }
      } else {
        // highlight.js supports a ton of languages, but we only ever use a
        // much smaller subset.  Restrict auto-detection to the ones we use
        // to avoid detecting incorrectly.  If someone wants to override,
        // they can specify the language explicitly in the markdown.
        const result = hljs.highlightAuto(str, [
          // keep-sorted start
          'bash',
          'c',
          'cpp',
          'css',
          'gn',
          'go',
          'html',
          'ini',
          'javascript',
          'json',
          'md',
          'protobuf',
          'python',
          'rust',
          'shell',
          'typescript',
          'xml',
          // keep-sorted end
        ]);
        return result.value;
      }

      // Return an empty string to get default code blocks.
      return '';
    },
    html: true,
  }).use(require('markdown-it-attrs'), {
    leftDelimiter: '{:',
    rightDelimiter: '}',
    allowedAttributes: ['id', 'class'],
  }).use(require('markdown-it-footnote'), {
  }).use(anchor, {
    slugify: s => uslug(s),
    level: 2,
    permalink: anchor.permalink.headerLink(),
  }).use(require('markdown-it-toc-done-right'), {
    slugify: uslug,
    tocClassName: 'toc',
    tocFirstLevel: 2,
    tocPattern: /\[TOC\]/,
  }).use(addSlashBreakOpportunities);

  config.setLibrary('md', mdlib);

  // Enable indented code blocks.
  config.amendLibrary("md", (mdLib) => mdLib.enable("code"));

  config.addCollection('allSortedByLowerCasedUrl', function(collectionApi) {
    return collectionApi.getAll().sort(function(a, b) {
      let x = a.url.toLowerCase();
      let y = b.url.toLowerCase()
      return (x > y) ? 1 : ((x < y) ? -1 : 0);
    });
  });

  // TODO(crbug.com/1271672): Figure out how to make this syntax and API
  // less clunky.
  const subpages = require('./scripts/subpages.js')
  function handleSubPages(collectionAll) {
    let pageUrl = this.page.url;
    return subpages.render(pageUrl, collectionAll);
  };
  config.addNunjucksShortcode("subpages", handleSubPages);

  // Copy binary assets over to the dist/ directory.

  const lob_extensions = getLobExtensions();

  // This should basically pick up everything that isn't a .md file
  // or a .sha1.
  // TODO(crbug.com/1457688): Figure out how to actually enforce this and get
  // rid of the "basically". There has to be a better approach. :).
  let extensions = lob_extensions.concat([
    // keep-sorted start
    '.cpp',
    '.css',
    '.csv',
    '.dot',
    '.ebuild',
    '.el',
    '.html',
    '.js',
    '.json',
    '.patch',
    '.py',
    '.txt',
    '.xml',
    // keep-sorted end
  ]);

  for (let ext of extensions) {
    config.addPassthroughCopy('site/**/*' + ext);
  }

  // Set up the Content-Security-Policy (CSP) hash filter. Every <script>
  // tag must be run through this filter so that the hash of its contents
  // will be in the list of approved scripts in the CSP HTTP header.
  const crypto = require('crypto');

  let script_hashes = new Set();
  function cspHash(raw) {
    const c = crypto.createHash('sha256');
    c.update(raw);
    let digest = c.digest('base64');
    script_hashes.add(`'sha256-${digest}'`);
    return raw;
  }

  config.addFilter('cspHash', cspHash);

  // Write out the firebase.json config file once we know which CSP
  // headers to set.
  config.on('afterBuild', () => {
    let script_src = " 'none'";
    if (script_hashes.size > 0) {
      script_src = '';
      for (const script_hash of script_hashes.values()) {
        script_src += ' ' + script_hash;
      }
      script_src += " 'unsafe-inline' 'strict-dynamic'";
    }

    fs.writeFileSync('firebase.json',
      JSON.stringify({
        'hosting': {
          'public': 'build',
          'ignore': [
            'firebase.json',
            '**/.*',
            '**/node_modules/**',
          ],
          'headers': [{
            'source': '**/*',
            'headers': [{
              'key': 'Content-Security-Policy',
              'value':
                "script-src" + script_src +
                "; object-src 'none'; base-uri 'none'; " +
                "report-uri https://csp.withgoogle.com/csp/chromium-website/",
              }],
          }],
        },
      }, null, 2) + '\n');
  });

  // Copy over Algolia files.
  config.addPassthroughCopy({
     'node_modules/@docsearch/js/dist/umd':
       '_scripts/@docsearch',
     'node_modules/@docsearch/css/dist':
       '_stylesheets/@docsearch',
     'node_modules/highlight.js/styles/github*.min.css':
       '_stylesheets/highlight.js/',
  });

  return {
    dir: {
      input: 'site',
      output: 'build'
    },
    markdownTemplateEngine: 'njk',
    templateFormats: ['md', 'njk'],
    htmlTemplateEngine: 'njk',
    xmlTemplateEngine: 'njk',
  };
};
