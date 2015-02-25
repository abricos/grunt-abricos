/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var Framework = require('../lib/Framework');
var config = require('../lib/utils/config');
var logHelper = config.logger().helper;

module.exports = function(grunt){
    grunt.registerMultiTask('abcore', 'Build Abricos Framework', function(){

        var options = this.options();
        var logger = config.logger();

        logger.info('start Framework build');

        var component;
        try {
            component = new Framework(options);
        } catch (e) {
            logger.error('initialize Framework, message=%s', logHelper.string(e.message));
            return;
        }

        var done = this.async(),
            fnName = options.action;

        if (typeof component[fnName] !== 'function'){
            logger.error('action %s not found in Framework', logHelper.string(options.action));
            done();
            return;
        }

        component[fnName](function(err){
            done(err);
        });
    });
};
