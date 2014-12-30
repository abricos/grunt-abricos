/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var Module = require('../lib/Module');
var Config = require('../lib/utils/Config');
var logHelper = require('../lib/utils/loghelper');

module.exports = function(grunt){
    grunt.registerMultiTask('abmodule', 'Build Abricos Module', function(){

        var options = this.options();
        var config = Config.instance();

        var logger = config.logger();
        logger.info('start module %s build', logHelper.string(options.name));

        var component;
        try {
            component = new Module(options);
        } catch (e) {
            logger.error('initialize Module %s, message=%s', logHelper.string(options.name), logHelper.string(e.message));
            return;
        }

        var done = this.async(),
            fnName = options.action;

        if (typeof component[fnName] !== 'function'){
            logger.error('action %s not found in Module', logHelper.string(options.action));
            done();
            return;
        }

        component[fnName](function(err){
            done(err);
        });
    });
};
