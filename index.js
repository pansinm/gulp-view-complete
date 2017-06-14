const through = require('through2');
const gutil = require('gulp-util');
const path = require('path');
const uuid = require('uuid');
const mkdirp = require('mkdirp');
const fs = require('fs');
const url = require('url');
const webpack = require('webpack');
const Utils = require('./src/utils');
const { processCss, processLess, processScss, processJs, preprocess, processAsset } = require('./src/processor');

const PluginError = gutil.PluginError;
const PLUGIN_NAME = 'gulp-view-complete';

function complete(filepath, options) {
  const ext = path.extname(filepath).toLowerCase();
  if (/\.(png|jpe?g|svg|ico)$/.test(ext)) {
    return processAsset(filepath, options);
  }

  switch (ext) {
    case '.js':
      return processJs(filepath, options);
    case '.css':
      return processCss(filepath, options);
    case '.less':
      return processLess(filepath, options);
    case '.scss':
      return processScss(filepath, options);
    default:
      return Promise.resolve();
  }
}

// 插件级别函数 (处理文件)
function viewComplete(options) {
  options.publicPath = options.publicPath || '/';
  options.assetsPath = options.assetsPath || path.resolve(process.cwd(), 'dist');
  const { publicPath } = options;

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
      const remarkObj = preprocess(input);
      content = remarkObj.content;
      remarkMap = remarkObj.remarkMap;
    }

    const done = Object.keys(remarkMap).reduce((promise, ref) => {
      const filepath = path.join(path.dirname(file.path), ref);

      return promise
        .then(() => complete(filepath, options))
        .then((assetPath) => {
          const finalUrl = assetPath ? url.resolve(publicPath, assetPath) : ref;
          const remarkId = remarkMap[ref];
          const reg = new RegExp(`${Utils.escapeRegExp(remarkId)}`, 'g');
          content = content.replace(reg, finalUrl);
        })
    }, Promise.resolve());

    done.then(() => {
      if (content) {
        file.contents = new Buffer(content);
      }
      cb(null, file);
    })
      .catch(err => {
        console.error(err);
        cb(null, file);
      });
  });
}

module.exports = viewComplete;
