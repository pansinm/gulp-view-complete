const through = require('through2');
const gutil = require('gulp-util');
const path = require('path');
const uuid = require('uuid');
const mkdirp = require('mkdirp');
const fs = require('fs');
const url = require('url');
const Utils = require('./src/utils');
const revCss = require("./src/revCss");
const webpack = require('webpack');

const PluginError = gutil.PluginError;
const PLUGIN_NAME = 'gulp-view-complete';

function remarkContent(content) {
  const reg = /(src|href)=(['"])((?:(?!\2).)*)\2/g;
  const remarkMap = {};
  const remarkedContent = content.replace(reg, (match, p1, p2, p3, str) => {
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
}

function webpackJs(filepath) {
  let entry = path.relative(process.cwd(), filepath).replace(/\\/g, '/');
  if (!entry.startsWith('.')) {
    entry = './' + entry;
  }

  return new Promise((resolve, reject) => {
    webpack({
      entry,
      output: {
        path: path.join(process.cwd(), 'dist'),
        filename: `js/${path.basename(filepath, '.js')}-[chunkHash].js`
      },
      module: {
        loaders: [{
          test: /\.(png|less|scss)$/,
          loader: 'file-loader?name=[name]-[hash:20].[ext]&outputPath=img/'
        }]
      }
    }, (err, stats) => {
      fs.writeFileSync('a.js', require('util').inspect(stats.compilation.entrypoints, {depth: 5}));
      err ? reject(err) : resolve(stats.compilation.entrypoints.main.chunks[0].files[0]);
    });
  });
}

function processCss(filepath) {
  const dir = path.dirname(filepath);
  const dest = 'dist';
  const publicPath = '/';
  const content = fs.readFileSync(filepath, 'utf8');
  const finalContent = revCss(content, { dir, dest });
  const finalBuffer = new Buffer(finalContent, 'utf8');
  const subdir = Utils.getAssetCategory(filepath);
  const hash = Utils.hash(finalBuffer);
  const destPath = path.join(dest, subdir);
  mkdirp.sync(destPath);
  const finalFilename = Utils.getHashFilename(filepath, hash);
  fs.writeFileSync(path.resolve(destPath, finalFilename), finalBuffer);
  const finalUrl = url.resolve(publicPath, `${subdir}/${finalFilename}`);
  return Promise.resolve(finalUrl);
}

function complete(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  switch (ext) {
    case '.js':
      return webpackJs(filepath);
    case '.css':
      return processCss(filepath);
    default:
      return Promise.resolve();
  }
}

// 插件级别函数 (处理文件)
function viewComplete(options) {

  // 创建一个让每个文件通过的 stream 通道
  return through.obj(function (file, enc, cb) {

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
      return cb();
    }

    let remarkMap = {};
    let content;

    if (file.isBuffer()) {
      const input = file.contents.toString();
      const remarkObj = remarkContent(input);
      content = remarkObj.content;
      remarkMap = remarkObj.remarkMap;
    }

    const done = Object.keys(remarkMap).reduce((promise, ref) => {
      const filepath = path.join(path.dirname(file.path), ref);

      return promise
        .then(() => complete(filepath))
        .then((finalUrl) => {
          const remarkId = remarkMap[ref];
          const reg = new RegExp(`${Utils.escapeRegExp(remarkId)}`, 'g');
          content = content.replace(reg, finalUrl || ref);
        });
    }, Promise.resolve());

    done.then(() => {
      if (content) {
        file.contents = new Buffer(content);
      }
      cb(null, file);
    });
  });
}

module.exports = viewComplete;
