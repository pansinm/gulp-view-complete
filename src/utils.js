const crypto = require('crypto');
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');

module.exports.hash = function (buf) {
  if (!Buffer.isBuffer(buf)) {
    throw new TypeError('Expected a buffer');
  }

  return crypto.createHash('md5').update(buf).digest('hex').substr(0, 20);
};

module.exports.hashFile = function (filepath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, (err, data) => {
      err ? reject(err) : resolve(this.hash(data));
    });
  });
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

module.exports.copyAsset = function(src, assetsPath) {
  return new Promise((resolve, reject) => {
    mkdirp(path.dirname(assetsPath), (err) => {
      if (err) {
        return reject(err);
      }

      const subdir = this.getAssetCategory(assetsPath);
      let relativePath;
      this.hashFile(src)
        .then(hash => this.getHashFilename(src, hash))
        .then(filename => {
          relativePath = path.join(subdir, filename);
          return path.join(assetsPath, relativePath)
        })
        .then(dest => {
          const readStream = fs.createReadStream(src);

          readStream.once('error', (err) => {
            reject(err);
          });

          readStream.once('end', () => {
            resolve(relativePath);
          });

          readStream.pipe(fs.createWriteStream(dest));
        });
    });
  });
};

module.exports.copyAssetSync = function(src, assetsPath, srcBuffer) {
  const buffer = srcBuffer || fs.readFileSync(src);
  const hash = this.hash(buffer);
  const filename = this.getHashFilename(src, hash);
  const subdir = this.getAssetCategory(src);
  const relativePath = path.join(subdir, filename);
  mkdirp.sync(path.join(assetsPath, subdir));
  fs.writeFileSync(path.join(assetsPath, relativePath), buffer);
  return relativePath;
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

  if (/\.(png|svg|jpe?g|ico)$/) {
    return 'img'
  }

  return 'mix';
};
