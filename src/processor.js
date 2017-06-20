const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const uuid = require('uuid');
const revCss = require('./revCss');
const Utils = require('./utils');

module.exports.processCss = function (filepath, options) {
  const cssDir = path.dirname(filepath);
  const { assetsPath, publicPath } = options;
  const content = fs.readFileSync(filepath, 'utf8');
  const finalContent = revCss(content, { cssDir, assetsPath, publicPath });
  const finalBuffer = new Buffer(finalContent, 'utf8');
  return Promise.resolve(Utils.copyAssetSync(filepath, assetsPath, finalBuffer));
};

module.exports.processLess = function (filepath, options) {
  const less = require('less');
  const { assetsPath, publicPath } = options;
  const input = fs.readFileSync(filepath, 'utf8');
  const dirname = path.dirname(filepath);
  return less.render(input, {
    paths: [dirname]
  })
    .then((output) => {
      const cssContent = revCss(output.css, {
        cssDir: dirname,
        publicPath,
        assetsPath
      });
      const src = filepath.replace(/\.less$/g, '.css');
      return Utils.copyAssetSync(src, assetsPath, new Buffer(cssContent));
    })
};

module.exports.processScss = function (filepath, options) {
  const sass = require('node-sass');
  const { assetsPath, publicPath } = options;
  const dirname = path.dirname(filepath);
  const result = sass.renderSync({
    file: filepath,
    includePaths: [dirname]
  });

  const cssContent = revCss(result.css.toString(), {
    cssDir: dirname,
    publicPath,
    assetsPath
  });
  const src = filepath.replace(/\.scss$/g, '.css');
  return Utils.copyAssetSync(src, assetsPath, new Buffer(cssContent));
};

module.exports.processAsset = function (filepath, options) {
  const { assetsPath } = options;
  return Utils.copyAsset(filepath, assetsPath);
};

module.exports.processJs = function (filepath, options) {
  const { publicPath, assetsPath } = options;
  let entry = path.relative(process.cwd(), filepath).replace(/\\/g, '/');
  if (!entry.startsWith('.')) {
    entry = './' + entry;
  }

  return new Promise((resolve, reject) => {
    webpack({
      entry,
      output: {
        publicPath,
        path: assetsPath,
        filename: `js/${path.basename(filepath, '.js')}-[chunkHash].js`
      },
      module: {
        loaders: [{
          test: /\.(png|jpe?g|svg|ico)$/,
          loader: 'file-loader?name=[name]-[hash:20].[ext]&outputPath=img/'
        }]
      }
    }, (err, stats) => {
      err ? reject(err) : resolve(stats.compilation.entrypoints.main.chunks[0].files[0]);
    });
  });
};

module.exports.preprocess = function (content) {
  const reg = /(src|href)=(['"])((?:(?!\2).)*)\2/g;
  const remarkMap = {};
  const remarkedContent = content.replace(reg, (match, p1, p2, p3, str) => {
    if (!Utils.isLocalFile(p3)) {
      return match;
    }

    let remarkId = remarkMap[p3];
    if (!remarkId) {
      remarkId = uuid.v4();
      remarkMap[p3] = remarkId;
    }
    return `${p1}=${p2}${remarkId}${p2}`;
  });

  return {
    content: remarkedContent,
    remarkMap
  };
};
