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
        logger.info("start build Module %s", logHelper.string(options.name));

        var abModule;
        try {
            abModule = new Module(options);
        } catch (e) {
            logger.error("Initialize Module '" + options.name + "', message: " + e.message);
            return;
        }

        var done = this.async();
        abModule.build(function(err){
            done(err);
        });
    });
};
