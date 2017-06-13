const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const url = require('url');

const Utils = require('./utils');

function revCss(content, options) {
  const { dir, dest, publicPath } = options;
  const reg = /url\((.*?)\)/g;
  const manifest = {};
  return content.replace(reg, (match, p1, str) => {
    const rawUrl = Utils.getQuoteContent(p1);
    if (!Utils.isLocalFile(rawUrl)) {
      return match;
    }

    const urlParts = rawUrl.split('?');
    const relativePath = urlParts.shift();
    const assetPath = path.join(dir, relativePath);
    if (!fs.existsSync(assetPath)) {
      return match;
    }

    if (manifest[assetPath]) {
      return `url(${manifest[assetPath]})`;
    }

    const ext = path.extname(assetPath);
    const baseName = path.basename(assetPath, ext);
    const subDir = Utils.getAssetCategory(assetPath);
    const assetBuffer = fs.readFileSync(assetPath);
    const hash = Utils.hash(assetBuffer);
    const outFilename = `${baseName}-${hash}${ext}`;
    let assetUrl = url.resolve(publicPath || '/', `${subDir}/${outFilename}`);
    const assetDir = path.resolve(dest, subDir);

    // copy
    mkdirp.sync(assetDir);
    fs.writeFileSync(path.resolve(assetDir, outFilename), assetBuffer);

    if (urlParts.join('')) {
      assetUrl += `?${urlParts}`;
    }

    manifest[assetPath] = assetUrl;

    return `url(${assetUrl})`;
  });
}

module.exports = revCss;
