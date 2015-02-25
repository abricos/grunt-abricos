/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var Template = require('../lib/Template');
var config = require('../lib/utils/config');

module.exports = function(grunt){

    grunt.registerMultiTask('abtemplate', 'Build Abricos Template', function(){
        var options = this.options();

        var logger = config.logger();
        var logHelper = logger.helper;

        logger.info('start template %s build', logHelper.string(options.name));

        var component;
        try {
            component = new Template(options.name, options);
        } catch (e) {
            logger.error(
                'initialize template %s, message=%s',
                logHelper.string(options.name),
                logHelper.string(e.message)
            );
            return;
        }

        var done = this.async(),
            fnName = options.action;

        if (typeof component[fnName] !== 'function'){
            logger.error('action %s not found in Template', logHelper.string(options.action));
            done();
            return;
        }

        component[fnName](function(err){
            done(err);
        });
    });
};
