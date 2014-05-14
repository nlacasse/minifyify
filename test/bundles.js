var fixtures = require('./fixtures')
  , utils = require('utilities')
  , fs = require('fs')
  , path = require('path')
  , assert = require('assert')
  , browserify = require('browserify')
  , validate = require('sourcemap-validator')
  , Minifyify = require('../lib')

  // Helpers
  , compileApp
  , testApp
  , clean = function () {
      utils.file.rmRf( path.join(fixtures.buildDir, 'apps'), {silent: true});
      utils.file.mkdirP( path.join(fixtures.buildDir, 'apps'), {silent: true});
    }

  // Tests
  , tests = {
      "before": clean
    };

compileApp = function (appname, map, next) {

  if(typeof map == 'function') {
    next = map;
    map = 'bundle.map.json';
  }

  var bundle = new browserify()
    , opts = {
        compressPaths: function (p) {
          return path.relative(path.join(__dirname, 'fixtures', appname), p);
        }
      , map: map
      }
    , minifier = new Minifyify(opts);

  bundle.add(fixtures.entryScript(appname));

  bundle = bundle
            .transform(require('hbsfy'))
            .transform(minifier.transformer)
            .bundle({debug: map !== false})

  bundle.pipe(minifier.consumer(function (src, map) {
    next(src, map)
  }));
};

/**
* Builds, uploads, and validates an app
*/
testApp = function(appname, cb) {
  var filename = fixtures.bundledFile(appname)
    , mapname = fixtures.bundledMap(appname)
    , destdir = fixtures.bundledDir(appname);

  // Compile lib
  compileApp(appname, function (min, map) {
    // Write to the build dir
    var appdir = path.join(fixtures.buildDir, 'apps', appname);

    utils.file.mkdirP( appdir, {silent: true});

    utils.file.cpR(fixtures.scaffoldDir
      , path.join(fixtures.buildDir, 'apps'), {rename:appname, silent:true});
    utils.file.cpR(path.dirname(fixtures.entryScript(appname))
      , path.join(fixtures.buildDir, 'apps'), {rename:appname, silent:true});
    fs.writeFileSync( path.join(destdir, path.basename(filename)), min );
    fs.writeFileSync( path.join(destdir, path.basename(mapname)), map );

    assert.doesNotThrow(function () {
      validate(min, map);
    }, appname + ' should not throw');

    cb();
  });
};

tests['simple file'] = function (next) {
  testApp('simple file', next);
};

tests['complex file'] = function (next) {
  testApp('complex file', next);
};

tests['native libs'] = function (next) {
  testApp('native libs', next);
};

tests['backbone app'] = function (next) {
  testApp('backbone app', next);
};

tests['transformed app'] = function (next) {
  testApp('transformed app', next);
};

tests['opts.map = false cb'] = function (next) {
  compileApp('simple file', false, function (min, map) {
    assert.ok(min);
    assert.ok(map == null);
    next();
  });
};

module.exports = tests;