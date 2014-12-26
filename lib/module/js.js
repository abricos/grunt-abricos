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

var logHelper = require('./../loghelper');

var UTF8 = 'utf-8';

var me = module.exports;

var JS = me.JS = function(manager, srcFile){
    this.manager = manager;
    this.srcFile = srcFile;
    this.srcDir = path.dirname(srcFile);
    this.config = manager.config;

    this.modName = manager.module.name;
    this.compName = this.name = path.basename(srcFile, '.js');
};
JS.prototype = {
    logger: function(){
        return this.manager.logger();
    },

    buildI18nSyncDeprecatedSync: function(){
        var compName = this.compName,
            i18nDir = path.join(this.srcDir, 'langs');

        var files = glob.sync(path.join(i18nDir, compName + '_*.js'));

        if (files.length === 0){
            return "";
        }

        var logger = this.logger();
        logger.debug('I18n (deprecated): found %s files', logHelper.number(files.length));

        var file, fName, lang, content = "", srcCode;
        for (var i = 0; i < files.length; i++){
            file = files[i];
            fName = path.basename(file, '.js');

            logger.debug('I18n (deprecated): start read %s', logHelper.path(file, this.srcDir));

            try {
                srcCode = fs.readFileSync(file, UTF8);
                logger.debug('I18n (deprecated): successfully read %s bytes', logHelper.number(srcCode.length));
            } catch (e) {
                logger.error(e.message);
                srcCode = "";
            }

            if (srcCode === ""){
                continue;
            }

            lang = fName.replace(compName + '_', '');
            content += "\n(function(){" + srcCode + "})();";
        }
        return content;
    },

    buildI18nSync: function(){
        var modName = this.modName,
            compName = this.compName,
            i18nDir = path.join(this.srcDir, 'langs');

        var files = glob.sync(path.join(i18nDir, compName + '_*.json'));
        if (files.length === 0){
            return "";
        }

        var logger = this.logger();
        logger.debug('I18n: found %s files', logHelper.number(files.length));

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

    buildTemplateSync: function(){
        var modName = this.modName,
            compName = this.compName;

        var file = path.join(this.srcDir, compName + '.htm');
        if (!fs.existsSync(file)){
            return "";
        }

        var logger = this.logger();
        logger.debug('Template: start read %s', logHelper.path(file, this.srcDir));

        var CHARCODE = {10: "n", 13: "r", 9: "t", 39: "'", 34: '"', 92: "\\"};

        var srcCode = "";

        try {
            srcCode = fs.readFileSync(file, UTF8);
            logger.debug('Template: successfully read %s bytes', logHelper.number(srcCode.length));
        } catch (e) {
            logger.error(e.message);
            return "";
        }

        var content =
            "\nAbricos.Template.add('mod." + [modName, compName].join('.') + "', " +
            "'" + srcCode.replace(/[\n\r\t\'\"\\]/g, function(m){
                return "\\" + CHARCODE[m.charCodeAt(0)]
            }) + "');";

        return content;
    },

    buildLESS: function(callback){
        var file = path.join(this.srcDir, this.compName + '.less');

        if (!fs.existsSync(file)){
            return callback(null, "");
        }

        var logger = this.logger();
        var lessOptions = this.config.get('less');
        var srcCode = "";

        logger.debug('LESS: start read %s', logHelper.path(file, this.srcDir));

        try {
            srcCode = fs.readFileSync(file, UTF8);
            logger.debug('LESS: successfully read %s bytes', logHelper.number(srcCode.length));
        } catch (err) {
            logger.error(err.message);
            return callback(null, "");
        }

        logger.debug('LESS: start compile');

        less.render(srcCode, lessOptions, function(err, output){
            if (err){
                logger.error(err.message);
                return callback(null, "");
            }
            var css = output.css;
            logger.debug('LESS: compile successfully %s bytes', logHelper.number(css.length));
            return callback(null, css);
        });
    },

    buildCSSSync: function(cssFromLess){
        var modName = this.modName,
            compName = this.compName,
            css = cssFromLess || "";

        var file = path.join(this.srcDir, compName + '.css');
        var logger = this.logger();

        if (fs.existsSync(file)){
            var srcCode = "";
            logger.debug('CSS: start read %s', logHelper.path(file, this.srcDir));

            try {
                srcCode = fs.readFileSync(file, UTF8);
                logger.debug('CSS: successfully read %s bytes', logHelper.number(srcCode.length));
            } catch (e) {
                logger.error(e.message);
                srcCode = "";
            }
            css += srcCode;
        }

        if (css === ""){
            return;
        }

        var CHARCODE = {10: "", 13: "", 9: "", 39: "\\" + "'", 34: "\\" + '"', 92: "\\" + "\\"};

        css = css.replace(/[\n\r\t\"\\]/g, function(m){
            return CHARCODE[m.charCodeAt(0)]
        });

        logger.debug('CSS: start minimize %s bytes', logHelper.number(css.length));

        try {
            css = (new CleanCSS()).minify(css).styles;
            logger.debug('CSS: successfully, new size %s bytes', logHelper.number(css.length));
        } catch (err) {
            logger.error(err.message);
            return "";
        }

        var content =
            "\nAbricos.CSS.add('mod." + [modName, compName].join('.') + "', " +
            "'" + css + "');";

        return content;
    },

    build: function(callback){
        var modName = this.modName,
            compName = this.compName,
            srcFile = this.srcFile,
            srcDir = this.srcDir,
            config = this.config,
            logger = this.logger(),
            fileVersion = "";

        logger.debug('build %s', logHelper.path(srcFile, srcDir));

        var content = "", cssFromLess = "";

        var stack = [], instance = this;

        stack.push(function(stackCallback){
            content =
                fs.readFileSync(instance.srcFile, UTF8) +
                instance.buildI18nSyncDeprecatedSync() +
                instance.buildI18nSync() +
                instance.buildTemplateSync();

            stackCallback();
        });

        stack.push(function(stackCallback){
            instance.buildLESS(function(err, css){
                if (!err){
                    cssFromLess = css;
                }
                stackCallback();
            });
        });

        stack.push(function(stackCallback){
            content += instance.buildCSSSync(cssFromLess);
            content +=
                "\nif (typeof Component != 'undefined'){\n" +
                "  Brick.add('" + modName + "', '" + compName + "', Component);\n" +
                "  Component = undefined;\n" +
                "}";

            content = content.replace("{C#MODNAME}", modName)
                .replace("{C#COMNAME}", compName);

            var destFile = path.join(config.get('build.dir'), compName + '.js');
            fs.writeFileSync(destFile, content);

            stackCallback();
        });

        stack.push(function(stackCallback){
            checksum.file(srcFile, function(err, sum){
                if (!err){
                    fileVersion = sum.substr(-8);
                }

                logger.debug('build successfully %s, %s bytes', logHelper.path(srcFile, srcDir), logHelper.number(content.length));

                stackCallback(err);
            });

        });

        async.series(stack, function(err){
            callback(err, {
                version: fileVersion
            });
        });
    },

    minify: function(callback){
        var compName = this.compName,
            destDir = this.config.get('build.dir'),
            logger = this.logger(),
            buildFile = path.join(destDir, compName + '.js'),
            minFile = path.join(destDir, compName + '-min.js');

        try {
            var result = UglifyJS.minify(buildFile);
            fs.writeFileSync(minFile, result.code);
        } catch (e) {

        }

        [this.srcFile, minFile].forEach(function(file){
            var gzip = zlib.createGzip();
            var inp = fs.createReadStream(file);
            var out = fs.createWriteStream(path.join(destDir, path.basename(file, '.js') + '.gz'));

            inp.pipe(gzip).pipe(out);
        });
        callback();
    }
};

var JSManager = function(module){
    this.module = module;
    this.list = [];
    this.id = [module.id, "js"].join(".");

    var config = this.config = require('./../config.js').instance(this.id, {
        source: {
            dir: 'js'
        },
        build: {
            dir: 'js'
        },
        temp: {
            dir: 'js',
            less: {
                dir: 'less'
            }
        },
        log: {
            console: {
                label: module.name + '.JSMan'
            }
        }
    });

    var logger = this.logger();

    var srcDir = config.pathResolve('^.source.dir', 'source.dir', true);
    var buildDir = config.pathResolve('^.build.dir', 'build.dir', true);
    var tempDir = config.pathResolve('^.temp.dir', 'temp.dir', true);

    logger.debug('souce dir %s', logHelper.path(srcDir));
    logger.debug('build dir %s', logHelper.path(buildDir));
    logger.debug('temp dir %s', logHelper.path(tempDir));

    fse.ensureDirSync(buildDir);

    var files = glob.sync(path.join(srcDir, '*.js')),
        list = this.list;

    for (var i = 0; i < files.length; i++){
        list[list.length] = new me.JS(this, files[i]);
    }

    this.logger().debug('initialized, files %s', logHelper.number(files.length));
};
JSManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    build: function(callback){
        var logger = this.logger(),
            config = this.config,
            components = {};

        logger.debug('start build');

        var stack = [];

        for (var i = 0; i < this.list.length; i++){
            (function(js){
                stack.push(function(stackCallback){
                    js.build(function(err, info){
                        components[js.name] = info.version;
                        stackCallback();
                    });
                });
            })(this.list[i]);
        }

        // Save info of components
        stack.push(function(stackCallback){
            var file = path.join(config.get('build.dir'), "files.json");
            fse.writeJSONSync(file, components);

            logger.debug('build successfully');
            stackCallback();
        });

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    },

    minify: function(callback){
        var logger = this.logger(),
            config = this.config,
            stack = [];

        for (var i = 0; i < this.list.length; i++){
            (function(js){
                stack.push(function(stackCallback){
                    js.minify(function(err, info){
                        stackCallback();
                    });
                });
            })(this.list[i]);
        }

        async.series(stack, function(err){
            if (callback){
                callback(err);
            }
        });
    }
};

module.exports.JSManager = JSManager;
