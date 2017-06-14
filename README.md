# gulp-view-complete

将类html模板引用的资源编译打包，加摘要

### input:
```html
<link rel="stylesheet" href="../fixture/less.less">
<link rel="stylesheet" href="../fixture/scss.scss">
<link rel="stylesheet" href="../fixture/css.css">
<%= hello %>
<img src="../fixture/test.png">
<script src="../fixture/test.js"></script>
```

### output
```html
<link rel="stylesheet" href="/css/less-c583c27e75e8fe6583b6.css">
<link rel="stylesheet" href="/css/scss-d60e5a3e44d1e921b1b6.css">
<link rel="stylesheet" href="/css/css-67a5359869b62d820ff4.css">
<%= hello %>
<img src="/img/test-25afbecf00164029ffca.png">
<script src="/js/test-1967298b1af240420f09.js"></script>
```

### Usage
```
 gulp
  .src(path.join(__dirname, 'app/view.ejs'))
  .pipe(viewComplete({
    publicPath: '/',
    assetsPath: path.join(__dirname, 'dist'),
  }))
  .pipe(gulp.dest('views'));
```