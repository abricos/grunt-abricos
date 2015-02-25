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
var async = require('async');
var merge = require('merge');
var bower = require('bower');
var checksum = require('checksum');

var config = require('../utils/config');
var logHelper = config.logger().helper;

var UTF8 = 'utf-8';
var DEFAULT_OPTIONS = {
    source: {
        bower: {
            'dir': '<%= directory %>/bower_components'
        },
        local: {
            dir: '<%= directory %>/vendor'
        }
    },
    build: {
        dir: '<%= ^^.build.dir %>/vendor'
    },
    log: {
        console: {
            label: '<%= ^.log.console.label %>.Vendor'
        }
    }
};
var CHECK_BUILD_FILE = 'vendor.json';

var VendorManager = function(owner){
    this.config = owner.config.children.create('vendor');
    this.config.setDefaults(DEFAULT_OPTIONS);
};
VendorManager.prototype = {
    logger: function(){
        return this.config.logger();
    },

    init: function(callback){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            directory = config.get('directory'),
            vendor = config.get('abricos.vendor');

        if (!vendor){
            return callback();
        }

        var deps = [];
        for (var name in vendor){
            var info = vendor[name];
            if ((new RegExp('^http(.*)')).test(info.endpoint)){
                deps[deps.length] = info.endpoint;
            } else {
                deps[deps.length] = name + '#' + info.endpoint;
            }
        }

        if (deps.length === 0){
            return callback();
        }

        this.info(null, true);

        logger.debug('bower: working directory %s', logHelper.path(directory));

        bower.commands.install(deps, {}, {
            cwd: directory
        }).on('log', function(result){
            logger.debug('bower: %s', result.message);
            // grunt.log.writeln(['bower', result.id.cyan, result.message].join(' '));
        }).on('end', function(){
            logger.info('bower: installation is complete');
            callback(null);
        }).on('error', function(error){
            logger.error('bower: %s', error.message);
            callback(error);
        });
    },

    _copyFiles: function(srcDir, buildDir, rule){
        if (Array.isArray(rule)){
            for (var i = 0; i < rule.length; i++){
                this._copyFiles(srcDir, buildDir, rule[i]);
            }
            return;
        }
        if (typeof rule === 'object'){
            if (rule.cwd){
                srcDir = path.join(srcDir, rule.cwd);
            }
            if (rule.dest){
                buildDir = path.join(buildDir, rule.dest);
            }
            rule = rule.src || "**";
        }

        if (typeof rule !== 'string'){
            return;
        }

        var files = glob.sync(path.join(srcDir, rule)),
            file, destFile, destDir;

        for (var i = 0; i < files.length; i++){
            file = files[i];
            destFile = path.join(buildDir, path.relative(srcDir, files[i]));
            destDir = path.dirname(destFile);
            fse.ensureDirSync(destDir);
            fse.copySync(file, destFile);
        }
    },

    _buildBowerVendor: function(name, buildRule, callback){
        var logger = this.logger(),
            config = this.config,
            instance = this,
            srcBowerDir = config.get('source.bower.dir'),
            srcDir = path.join(srcBowerDir, name),
            bowerJSONFile = path.join(srcDir, '.bower.json'),
            buildDir = config.get('build.dir'),
            buildVendorDir = path.join(buildDir, name),
            buildVersionFile = path.join(buildVendorDir, CHECK_BUILD_FILE),
            vendorInfo = config.get('abricos.vendor.' + name),
            vendorInfoString = JSON.stringify(vendorInfo),
            vendorChecksum = checksum(vendorInfoString),
            vendorCheckInfo;

        if (fs.existsSync(buildVersionFile)){
            vendorCheckInfo = fse.readJSONFileSync(buildVersionFile, UTF8);
            if (vendorCheckInfo.version === vendorChecksum){
                logger.debug('vendor %s not changed', logHelper.string(name));
                return callback ? callback() : null;
            }
        }
        vendorCheckInfo = {
            version: vendorChecksum
        };

        logger.debug('build %s', logHelper.string(name));

        var stack = [];
        if (!fs.existsSync(bowerJSONFile)){
            logger.debug('bower vendor %s not install', logHelper.string(name));
            stack.push(function(stackCallback){
                instance.init(function(err){
                    stackCallback(err);
                });
            });
        }

        stack.push(function(stackCallback){
            // logger.debug('clean %s', logHelper.path(buildVendorDir));
            // fse.removeSync(buildVendorDir);
            instance._copyFiles(srcDir, buildVendorDir, buildRule);

            fse.writeJSONFileSync(buildVersionFile, vendorCheckInfo);

            stackCallback();
        });

        async.series(stack, function(err){
            return callback(err);
        });
    },

    build: function(callback){
        callback = callback || function(){
        };

        var logger = this.logger(),
            config = this.config,
            vendors = config.get('abricos.vendor', {default: {}}),
            instance = this;

        var stack = [];

        logger.debug('start build');

        this.info(null, true);

        for (var name in vendors){
            (function(vendorName, buildRule){
                stack.push(function(stackCallback){
                    instance._buildBowerVendor(vendorName, buildRule, function(err){
                        stackCallback(err);
                    });
                });
            })(name, vendors[name].build);
        }

        async.series(stack, function(err){
            return callback(err);
        });
    },

    info: function(callback, isDebug){
        var logger = this.logger(),
            config = this.config,
            directory = config.get('directory'),
            srcLocalDir = config.get('source.local.dir'),
            srcBowerDir = config.get('source.bower.dir'),
            buildDir = config.get('build.dir'),
            vendors = config.get('abricos.vendor', {default: {}}),
            level = isDebug ? 'debug' : 'info';

        logger[level]('directory %s', logHelper.path(directory));
        logger[level]('souce local dir %s', logHelper.path(srcLocalDir));
        logger[level]('souce bower dir %s', logHelper.path(srcBowerDir));
        logger[level]('build dir %s', logHelper.path(buildDir));

        if (vendors){
            for (var name in vendors){
                var info = vendors[name];
                logger[level](
                    'vendor %s, endpoint=%s, build=%s',
                    logHelper.string(name),
                    logHelper.string(info.endpoint),
                    logHelper.string(info.build)
                );
            }
        }

        return callback ? callback() : null;
    }
};

module.exports = VendorManager;
