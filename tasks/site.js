/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var Site = require('../lib/Site');
var Config = require('../lib/utils/Config');
var logHelper = Config.utils.helper;

module.exports = function (grunt) {

    grunt.registerMultiTask('absite', 'Build Abricos Site', function () {
        var options = this.options();
        var config = Config.instance();

        var logger = config.logger();
        logger.info('start site build');

        var component;
        try {
            component = new Site(options);
        } catch (e) {
            logger.error('initialize site %s, message=%s', logHelper.string(options.name), logHelper.string(e.message));
            return;
        }

        var done = this.async(),
            fnName = options.action;

        if (typeof component[fnName] !== 'function'){
            logger.error('action %s not found in Site', logHelper.string(options.action));
            done();
            return;
        }

        component[fnName](function(err){
            done(err);
        });
    });
};
