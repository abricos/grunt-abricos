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

var vm = require('vm');

var config = require('../utils/config');
var logHelper = config.logger().helper;

var constParser = require('./constParser');

var UTF8 = 'utf-8';

var JSComponent = function(manager, srcFile){
    this.manager = manager;
    this.srcFile = srcFile;
    this.srcDir = path.dirname(srcFile);
    this.config = manager.config;

    this.modName = manager.config.get('abricos.name');
    this.compName = this.name = path.basename(srcFile, '.js');
};
JSComponent.prototype = {
    logger: function(){
        return this.manager.logger();
    },

    buildI18nSyncDeprecatedSync: function(){
        var modName = this.modName,
            compName = this.compName,
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

            srcCode = srcCode.replace(/\{C\#MODNAME\}/g, modName)
                .replace(/\{C\#COMNAME\}/g, compName);

            (function(){

                var initSandbox = {
                    Brick: {
                        util: {
                            Language: {
                                add: function(langId, obj){
                                    if (!obj || !obj.mod){
                                        return;
                                    }
                                    if (langId === 'ru'){
                                        langId = 'ru-RU'
                                    }

                                    content +=
                                        "\nAbricos.Language.add('mod', " + "'" + langId + "', "
                                        + JSON.stringify(obj.mod) +
                                        ");";
                                }
                            }
                        }
                    }
                };
                var context = vm.createContext(initSandbox);
                vm.runInContext(srcCode, context);
            })();

            // lang = fName.replace(compName + '_', '');
            // content += "\n(function(){" + srcCode + "})();";
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

        var CHARCODE = {10: "", 13: "", 9: "", 39: "\\'", 34: '\\"', 92: "\\\\"};

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
                return CHARCODE[m.charCodeAt(0)]
            }) + "');";

        return content;
    },

    buildLESS: function(callback){
        var file = path.join(this.srcDir, this.compName + '.less'),
            config = this.config;

        if (!fs.existsSync(file)){
            return callback(null, "");
        }

        var logger = this.logger();
        var lessOptions = config.get('less');
        var srcCode = "";

        logger.debug('LESS: start read %s', logHelper.path(file, this.srcDir));

        try {
            srcCode = fs.readFileSync(file, UTF8);
            logger.debug('LESS: successfully read %s bytes', logHelper.number(srcCode.length));
        } catch (err) {
            logger.error(err.message);
            return callback(null, "");
        }

        srcCode = constParser.parse(config.parent, srcCode);

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
        var config = this.config,
            modName = this.modName,
            compName = this.compName,
            srcFile = this.srcFile,
            srcDir = this.srcDir,
            config = this.config,
            logger = this.logger(),
            fileVersion = "",
            destFile;

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

            content = content.replace(/\{C\#MODNAME\}/g, modName)
                .replace(/\{C\#COMNAME\}/g, compName);

            content = constParser.parse(config.parent, content);

            var buildDir = config.get('build.dir');
            fse.ensureDirSync(buildDir);

            destFile = path.join(buildDir, compName + '.js');
            fs.writeFileSync(destFile, content);

            stackCallback();
        });

        stack.push(function(stackCallback){
            checksum.file(destFile, function(err, sum){
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

var DEFAULT_OPTIONS = {
    source: {
        dir: '<%= ^.source.dir %>/js'
    },
    build: {
        dir: '<%= ^.build.dir %>/js'
    },
    log: {
        console: {
            label: '<%= ^.log.console.label %>.JS'
        }
    }
};
var JSManager = function(owner){
    this.config = owner.config.children.create('js');
    this.config.setDefaults(DEFAULT_OPTIONS);

    var logger = this.logger();

    this.list = [];

    var files = glob.sync(path.join(this.config.get('source.dir'), '*.js')),
        list = this.list;

    for (var i = 0; i < files.length; i++){
        list[list.length] = new module.exports.JSComponent(this, files[i]);
    }

    logger.debug('initialized, files %s', logHelper.number(files.length));
};
JSManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    build: function(callback){
        var logger = this.logger(),
            config = this.config,
            components = {},
            sVersion = '',
            instance = this,
            list = this.list;

        if (list.length === 0){
            return callback ? callback() : null;
        }

        logger.debug('start build');

        var stack = [];

        for (var i = 0; i < list.length; i++){
            (function(js){
                stack.push(function(stackCallback){
                    js.build(function(err, info){
                        components[js.name] = info.version;
                        sVersion += info.version + '';
                        stackCallback();
                    });
                });
            })(list[i]);
        }

        // Save info of components
        stack.push(function(stackCallback){
            sVersion = checksum(sVersion).substr(-8);
            var file = path.join(config.get('build.dir'), "files.json"),
                info = {
                    version: sVersion,
                    files: components
                };
            fse.writeJSONSync(file, info);

            logger.debug('build successfully');
            stackCallback();
        });

        // minify
        stack.push(function(stackCallback){
            instance.minify(stackCallback);
        });

        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    },

    minify: function(callback){
        var stack = [];

        for (var i = 0; i < this.list.length; i++){
            (function(js){
                stack.push(function(stackCallback){
                    js.minify(function(err){
                        stackCallback(err);
                    });
                });
            })(this.list[i]);
        }

        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    },

    info: function(callback){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        return callback ? callback() : null;
    }
};

JSManager.JSComponent = JSComponent;
module.exports = JSManager;
