/*
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
var UglifyJS = require("uglify-js");
var merge = require("merge");
var less = require('less');

var logHelper = require('../utils/loghelper');
var Config = require('../utils/Config');

var UTF8 = 'utf-8';

var AssetsManager = function(options){
    options = options || {};

    if (!options.parentConfig){
        throw new Error('`options.parentConfig` not set in AssetsManager');
    }

    var configId = [options.parentConfig.id, "assets"].join(".");
    var config = Config.instance(configId, {
        source: {
            dir: 'assets'
        },
        build: {
            dir: 'assets'
        },
        log: {
            console: {
                label: '<%= ^.log.console.label %>.ASSETS'
            }
        }
    });
    this.config = config;

    var logger = this.logger();

    var srcDir = config.pathResolve('^.source.dir', 'source.dir', true);
    var buildDir = config.pathResolve('^.build.dir', 'build.dir', true);

    logger.debug('souce dir %s', logHelper.path(srcDir));
    logger.debug('build dir %s', logHelper.path(buildDir));

    fse.ensureDirSync(buildDir);
};
AssetsManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    _buildFile: function(srcFile){
        var config = this.config,
            logger = this.logger(),
            srcDir = config.get('source.dir'),
            relSrcFile = path.relative(srcDir, srcFile),
            buildDir = config.get('build.dir'),
            destFile = path.join(buildDir, relSrcFile),
            destDir = path.dirname(destFile),
            extname = path.extname(relSrcFile),
            name = path.basename(srcFile, extname),
            content;

        fse.ensureDirSync(destDir);

        content = fs.readFileSync(srcFile, UTF8);

        if (extname.toLowerCase() === '.less'){

            destFile = path.join(destDir, name + '.css');
            try {
                logger.debug('LESS: successfully read %s bytes', logHelper.number(content.length));
            } catch (err) {
                logger.error(err.message);
                return;
            }

            var lessOptions = config.get('less');

            less.render(content, lessOptions, function(err, output){
                if (err){
                    logger.error(err.message);
                    return callback(null, "");
                }
                var css = output.css;
                logger.debug('LESS: compile successfully %s bytes', logHelper.number(css.length));
                fs.writeFileSync(destFile, content);

                var destFileMin = path.join(destDir, name + '-min.css');
                var contentMin = (new CleanCSS()).minify(content).styles;
                fs.writeFileSync(destFileMin, contentMin);
            });

        } else {
            fs.writeFileSync(destFile, content);
        }
    },

    _buildDir: function(dir){

        if (path.dirname(dir) === 'includes'){
            // ignore LESS includes dir
            return;
        }

        var files = glob.sync(path.join(dir, '*')),
            file, stat;
        for (var i = 0; i < files.length; i++){
            file = files[i];
            stat = fs.lstatSync(file);
            if (stat.isDirectory()){
                this._buildDir(file);
            } else if (stat.isFile()){
                this._buildFile(file);
            }
        }
    },

    build: function(callback){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        fse.removeSync(buildDir);

        logger.debug('start build');

        this._buildDir(srcDir);

        if (callback){
            callback();
        }
    },

    info: function(callback){
        var logger = this.logger(),
            config = this.config,
            srcDir = config.get('source.dir'),
            buildDir = config.get('build.dir');

        logger.info('souce dir %s', logHelper.path(srcDir));
        logger.info('build dir %s', logHelper.path(buildDir));

        if (callback){
            callback();
        }
    }
};

module.exports = AssetsManager;
