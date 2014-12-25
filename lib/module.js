/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var util = require("util");
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var CleanCSS = require('clean-css');
var zlib = require('zlib');
var async = require('async');
var checksum = require('checksum');
var UglifyJS = require("uglify-js");
var merge = require("merge");
var less = require('less');

var js = require('./js');

var UTF8 = 'utf-8';

var Module = module.exports = function(options){

    options = merge({
        directory: process.cwd()
    }, options || {});

    this.directory = path.resolve(options.directory);

    if (options.name){
        this.name = options.name;
    }

    // check package.json
    var pkg = this.getPackageInfo();

    if (!this.name){
        this.name = pkg.name;
    }

    this.id = "module_" + this.name;

    var config = this.config = require('./config.js').instance(this.id, {
        directory: options.directory,
        build: {
            dir: 'modules/' + this.name
        },
        temp: {
            dir: 'modules/' + this.name
        },
        source: {
            dir: 'src'
        },
        log: {
            console: {
                label: this.name
            }
        }
    });
    config.load();

    var logger = this.logger();

    config.pathResolve('directory', 'source.dir', true);
    config.pathResolve('^.build.dir', 'build.dir', true);
    config.pathResolve('^.temp.dir', 'temp.dir', true);

    this.logger().debug('beginning of JSManager initialization in `' + this.name + '`');
    try {
        this.jsManager = new js.JSManager(this);
    } catch (e) {
        logger.error('initializing JSManager, message=`' + e.message + '`');
    }

    this.logger().debug('initialized Module: ' + this.name);
};
Module.prototype = {
    logger: function(){
        return this.config.logger();
    },
    getPackageInfo: function(){
        if (this._package){
            return this._package;
        }

        var packageFile = this._packageFile = path.join(this.directory, "package.json");
        var pkg;
        try {
            pkg = fse.readJSONFileSync(packageFile, UTF8);
        } catch (e) {
            var msg = "File not found or access denied or JSON syntax error in '" + path.relative(process.cwd(), packageFile) + "'";
            throw new Error(msg);
        }
        this._package = pkg;

        if (!pkg.version){
            var msg = "Version not set in package.json'" + path.relative(process.cwd(), this._packageFile) + "'";
            throw new Error(msg);
        }

        return pkg;
    },

    lessBuildFile: function(srcFile, destFile, callback){
        var options = this.config.get('less'),
            srcCode = fs.readFileSync(srcFile, UTF8),
            instance = this;

        this.logger().debug("LESS file compile: '" + path.relative(process.cwd(), srcFile) + "'");

        less.render(srcCode, options, function(err, output){
            if (err){
                return callback(err);
            }
            instance.logger().debug("LESS result write to '" + path.relative(process.cwd(), destFile) + "'");

            fs.writeFileSync(destFile, output.css)
            return callback(null);
        });
    },

    lessBuildDir: function(srcDir, destDir, callback){
        var files = glob.sync(path.join(srcDir, '*.less'));
        var stack = [], instance = this;

        for (var i = 0; i < files.length; i++){
            (function(file){
                stack.push(function(stackCallback){
                    var name = path.basename(file, '.less'),
                        destFile = path.join(destDir, name + '.css');
                    instance.lessBuildFile(file, destFile, function(err){
                        stackCallback(err);
                    })
                });
            })(files[i]);
        }

        async.series(stack, function(err){
            callback(err);
        });
    },

    buildJSI18nOldVersion: function(srcFile){
        var compName = this._jsComponentName(srcFile),
            srcDir = path.dirname(srcFile),
            i18nDir = path.join(srcDir, 'langs');

        var files = glob.sync(path.join(i18nDir, compName + '_*.js'));
        var file, fName, lang, content = "";
        for (var i = 0; i < files.length; i++){
            file = files[i];
            fName = path.basename(file, '.js');
            lang = fName.replace(compName + '_', '');
            content +=
                "\n(function(){" + fs.readFileSync(file, UTF8) + "})();";
        }
        return content;
    },

    buildJSI18n: function(srcFile){
        var modName = this.name,
            compName = this._jsComponentName(srcFile),
            srcDir = path.dirname(srcFile),
            i18nDir = path.join(srcDir, 'langs');

        var files = glob.sync(path.join(i18nDir, compName + '_*.json'));
        var file, fName, lang, content = "";
        for (var i = 0; i < files.length; i++){
            file = files[i];
            fName = path.basename(file, '.json');
            lang = fName.replace(compName + '_', '');

            content +=
                "\nAbricos.Language.add('mod." + [modName, compName].join('.') + "', " +
                "'" + lang + "', " +
                fs.readFileSync(file, UTF8) +
                ");";
        }
        return content;
    },

    buildJSCSS: function(srcFile, overCSSDir){
        var modName = this.name,
            compName = this._jsComponentName(srcFile),
            srcDir = path.dirname(srcFile);

        var file = path.join(overCSSDir, compName + '.css');
        if (!fs.existsSync(file)){
            file = path.join(srcDir, compName + '.css');
            if (!fs.existsSync(file)){
                return "";
            }
        }
        var CHARCODE = {
            10: "",
            13: "",
            9: "",
            39: "\\" + "'",
            34: "\\" + '"',
            92: "\\" + "\\"
        };

        var css = fs.readFileSync(file, UTF8).replace(/[\n\r\t\"\\]/g, function(m){
            return CHARCODE[m.charCodeAt(0)]
        });

        css = new CleanCSS().minify(css).styles;

        var content =
            "\nAbricos.CSS.add('mod." + [modName, compName].join('.') + "', " +

            "'" + css + "');";

        return content;
    },

    buildJSTempalte: function(srcFile){
        var modName = this.name,
            compName = this._jsComponentName(srcFile),
            srcDir = path.dirname(srcFile);

        var file = path.join(srcDir, compName + '.htm');
        if (!fs.existsSync(file)){
            return "";
        }

        var CHARCODE = {
            10: "n",
            13: "r",
            9: "t",
            39: "'",
            34: '"',
            92: "\\"
        };

        var content =
            "\nAbricos.Template.add('mod." + [modName, compName].join('.') + "', " +

            "'" + fs.readFileSync(file, UTF8).replace(/[\n\r\t\'\"\\]/g, function(m){
                return "\\" + CHARCODE[m.charCodeAt(0)]
            }) + "');";

        return content;
    },


    _jsComponentName: function(file){
        return path.basename(file, '.js')
    },

    jsComponentBuildFile: function(srcFile, destFile, overCSSDir, callback){
        var modName = this.name,
            compName = this._jsComponentName(srcFile);

        var content =
            fs.readFileSync(srcFile, UTF8) +
            this.buildJSI18nOldVersion(srcFile) +
            this.buildJSI18n(srcFile) +
            this.buildJSTempalte(srcFile) +
            this.buildJSCSS(srcFile, overCSSDir) +
            "\nif (typeof Component != 'undefined'){\n" +
            "  Brick.add('" + modName + "', '" + compName + "', Component);\n" +
            "  Component = undefined;\n" +
            "}";

        content = content.replace("{C#MODNAME}", modName);
        content = content.replace("{C#COMNAME}", compName);

        //jsDestFile = path.join(buildTempDir, compName + '.js');
        //fs.writeFileSync(jsDestFile, content);
        callback();
    },

    jsComponentBuildDir: function(srcDir, destDir, overCSSDir, callback){
        var files = glob.sync(path.join(srcDir, '*.js'));

        var stack = [], instance = this;

        for (var i = 0; i < files.length; i++){
            (function(file){
                stack.push(function(stackCallback){
                    var name = path.basename(file, '.js'),
                        destFile = path.join(destDir, name + '.js');
                    instance.jsComponentBuildFile(file, destFile, overCSSDir, function(err){
                        stackCallback(err);
                    })
                });
            })(files[i]);
        }

        async.series(stack, function(err){
            callback(err);
        });
    },

    jsBuild: function(callback){

        return;
        this.logger().debug("start jsBuild in module builder");

        var config = this.config,
            tempDir = config.get('temp.dir'),
            tempJSDir = config.get('temp.js.dir'),
            tempJSLessDir = config.get('temp.js.less.dir'),
            sourceJSDir = config.get('source.js.dir');

        // Clean temp build dir
        this.logger().debug("clean temp dir: " + path.relative(process.cwd(), tempDir));
        fse.removeSync(tempDir);
        fse.ensureDirSync(tempDir);
        fse.ensureDirSync(tempJSDir);
        fse.ensureDirSync(tempJSLessDir);

        var stack = [],
            instance = this;

        // LESS
        stack.push(function(stackCallback){
            instance.lessBuildDir(sourceJSDir, tempJSLessDir, function(err){
                stackCallback(err);
            });
        });

        // Compile Abricos JS Component
        stack.push(function(stackCallback){
            instance.jsComponentBuildDir(sourceJSDir, tempJSDir, tempJSLessDir, function(err){
                stackCallback(err);
            });
        });

        // Clean temp build dir
        // fse.removeSync(buildTempDirLess);


        async.series(stack, function(err){
            callback(err ? err : null);
        });

    }
};

var _old = function(){




    var components = {};

    // Checksum
    stack.push(function(stackCallback){
        checksumFiles(buildTempDir, components, stackCallback);
    });

    // Save info of components
    stack.push(function(stackCallback){
        var file = path.join(buildTempDir, "files.json");
        fse.writeJSON(file, components, stackCallback);
    });

    stack.push(function(stackCallback){
        var jsFiles = glob.sync(path.join(buildTempDir, '*.js'));
        var jsFile, outFile, result, compName;
        for (var i = 0; i < jsFiles.length; i++){
            jsFile = jsFiles[i];
            compName = path.basename(jsFile, '.js');
            outFile = path.join(buildTempDir, compName + '-min.js');
            try {
                result = UglifyJS.minify(jsFile);
                fs.writeFileSync(outFile, result.code);
            } catch (e) {
                grunt.log.error("Error in " + compName + ".js, line: " + e.line + ": " + e.message);
            }
        }
        stackCallback(null);
    });

    stack.push(function(stackCallback){
        // GZip JS Files
        var jsFiles = glob.sync(path.join(buildTempDir, '*.js'));
        var jsFile, gzip, inp, out;
        for (var i = 0; i < jsFiles.length; i++){
            jsFile = jsFiles[i];
            gzip = zlib.createGzip();
            inp = fs.createReadStream(jsFile);
            out = fs.createWriteStream(path.join(buildTempDir, path.basename(jsFile, '.js') + '.gz'));

            inp.pipe(gzip).pipe(out);
        }

        stackCallback(null);
    });

    /*
     // copy all files from source JS dir
     stack.push(function(stackCallback){
     fse.copy(srcDir, buildTempDir, function(err){
     if (err){
     grunt.log.warn(err);
     }
     stackCallback(err);
     });
     });


     // Delete less files in temp dir
     stack.push(function(stackCallback){
     var globFiles = glob.sync(path.join(buildTempDir, '*.less'));
     for (var i = 0; i < globFiles.length; i++){
     var file = globFiles[i];
     fse.removeSync(file);
     }
     stackCallback(null);
     });
     /**/

};





var checksumFiles = function(dir, components, callback){
    var stack = [];

    var jsFiles = glob.sync(path.join(dir, '*.js'));
    for (var i = 0; i < jsFiles.length; i++){
        (function checksumJS(file){
            var compName = path.basename(file, '.js');

            stack.push(function(stackCallback){
                checksum.file(file, function(err, sum){
                    if (!err){
                        components[compName] = sum.substr(-8);
                    }
                    stackCallback(err);
                });
            });
        })(jsFiles[i]);
    }

    async.series(stack, function(err){
        callback(err);
    });

};
