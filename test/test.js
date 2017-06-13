const viewComplete = require('../');
const expect = require('chai').expect;
const gulp = require('gulp');
const path = require('path');

it('real', function (done) {

  let pipe = gulp.src(path.join(__dirname, 'views/view.ejs')).pipe(viewComplete({
    version: '0.0.1'
  })).pipe(gulp.dest('dist/views'));
  let resultFile;

  pipe.on('data', function (file) {
    resultFile = file;
  });

  pipe.on('end', function (data) {
    done();
  });

  // function check() {
  //   let result = resultFile.contents.toString();
  //   expect(result.match(/\?version=0\.0\.1/g)).to.have.length(1);
  // }
});
