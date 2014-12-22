/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var CleanCSS = require('clean-css');
var zlib = require('zlib');
var async = require('async');
var checksum = require('checksum');

var less = require('./less.js');

var BUILD_TEMP = 'build_temp';
var UTF8 = 'utf-8';

var buildJSI18n = function(srcDir, modName, compName){
    var i18nDir = path.resolve(srcDir, 'langs');
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
};

var buildJSI18nOldVersion = function(srcDir, modName, compName){
    var i18nDir = path.resolve(srcDir, 'langs');
    var files = glob.sync(path.join(i18nDir, compName + '_*.js'));
    var file, fName, lang, content = "";
    for (var i = 0; i < files.length; i++){
        file = files[i];
        fName = path.basename(file, '.js');
        lang = fName.replace(compName + '_', '');

        content +=
            "\nfunction(){" + fs.readFileSync(file, UTF8) + "}();";
    }
    return content;
};

var buildJSTempalte = function(srcDir, modName, compName){
    var file = path.resolve(srcDir, compName + '.htm');
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

        "'" + fs.readFileSync(file, UTF8).replace(/[\n\r\t\"\\]/g, function(m){
            return "\\" + CHARCODE[m.charCodeAt(0)]
        }) + "');";

    return content;
};

var buildJSCSS = function(buidlLessDir, srcDir, modName, compName){
    var file = path.resolve(buidlLessDir, compName + '.css');
    if (!fs.existsSync(file)){
        file = path.resolve(srcDir, compName + '.css');
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
                        components[compName] = sum;
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

module.exports = function(grunt, options, callback){

    var projectDir = path.resolve(options.directory);
    var srcDir = path.resolve(projectDir, 'src', 'js');
    var buildTempDir = path.resolve(projectDir, BUILD_TEMP, 'js');
    var buildTempDirLess = path.resolve(projectDir, BUILD_TEMP, 'js', 'css');

    var a = projectDir.split(path.sep);
    var modName = a[a.length - 1];

    // Clean temp build dir
    fse.removeSync(buildTempDir);

    var stack = [];

    // LESS
    stack.push(function(stackCallback){
        less(grunt, srcDir, buildTempDirLess, options, stackCallback);
    });

    // Compile Abricos JS Component
    stack.push(function(stackCallback){
        var jsFiles = glob.sync(path.join(srcDir, '*.js'));
        var jsFile, compName, content, jsDestFile;
        for (var i = 0; i < jsFiles.length; i++){
            jsFile = jsFiles[i];
            compName = path.basename(jsFile, '.js');

            content =
                fs.readFileSync(jsFile, UTF8) +
                buildJSI18nOldVersion(srcDir, modName, compName) +
                buildJSI18n(srcDir, modName, compName) +
                buildJSTempalte(srcDir, modName, compName) +
                buildJSCSS(buildTempDirLess, srcDir, modName, compName) +
                "\nif (typeof Component != 'undefined'){\n" +
                "  Brick.add('" + modName + "', '" + compName + "', Component);\n" +
                "  Component = undefined;\n" +
                "}";

            content = content.replace("{C#MODNAME}", modName);
            content = content.replace("{C#COMNAME}", compName);

            jsDestFile = path.resolve(buildTempDir, compName + '.js');
            fs.writeFileSync(jsDestFile, content);
        }

        // Clean temp build dir
        fse.removeSync(buildTempDirLess);

        stackCallback(null);
    });

    var components = {};

    // Checksum
    stack.push(function(stackCallback){
        checksumFiles(buildTempDir, components, stackCallback);
    });

    // Save info of components
    stack.push(function(stackCallback){
        var file = path.join(buildTempDir, "meta.json");
        fse.writeJSON(file, components, stackCallback);
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

    async.series(stack, function(err){
        if (err){
            callback(err);
        } else {
            callback(null);
        }
    });
};
