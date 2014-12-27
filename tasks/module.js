/*
 * grunt-abricos
 * https://github.com/roosit/grunt-abricos
 *
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var Module = require('../lib/module');

module.exports = function(grunt){
    grunt.registerMultiTask('abmodule', 'Build Abricos Module', function(){

        var config = require('../lib/config.js').instance();
        config.load();

        var options = this.options();
        var abModule;
        try {
            abModule = new Module(options);
        } catch (e) {
            config.logger().error("Initialize Module '" + options.name + "', message: " + e.message);
            return;
        }

        var done = this.async();

        abModule.build(function(err){
            done(err);
        });
    });
};
