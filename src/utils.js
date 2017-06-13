const crypto = require('crypto');
const path = require('path');

module.exports.hash = function (buf) {
  if (!Buffer.isBuffer(buf)) {
    throw new TypeError('Expected a buffer');
  }

  return crypto.createHash('md5').update(buf).digest('hex').substr(0, 20);
};

module.exports.isLocalFile = function (filepath) {
  return !/^(http|https|\/)/.test(filepath);
};

module.exports.getQuoteContent = function (content) {
  const results = /^(["'])?(.*?)\1$/.exec(content);
  return results ? results[2] : null;
};

module.exports.getHashFilename = function (originName, hash) {
  const ext = path.extname(originName);
  const baseName = path.basename(originName, ext);
  return `${baseName}-${hash}${ext}`;
};

module.exports.escapeRegExp = function (string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

module.exports.getAssetCategory = function (assetPath) {
  assetPath = assetPath.toLowerCase();

  if (/\.(js)$/.test(assetPath)) {
    return 'js';
  }

  if (/\.(css)$/.test(assetPath)) {
    return 'css';
  }

  if (/\.(eot|ttf|woff)/.test(assetPath)) {
    return 'fonts'
  }

  if (/\.(png|svg|jpg|jpeg)$/) {
    return 'img'
  }

  return 'mix';
};
