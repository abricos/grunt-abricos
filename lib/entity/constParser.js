/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var path = require('path');

var me = module.exports;

me.regexp = {
    version: /\{C\#VERSION\}/g,
    assets: /\{C\#ASSETS\}/g
};

me.parseVersion = function(config, content){
    var version = config.get('package.version');

    content = content.replace(me.regexp.version, version);

    return content;
};

me.parseAssets = function(config, content){

    var buildDir = config.get('build.dir'),
        rootBuildDir = config.get('^^.build.dir'),
        relBuildDir = path.relative(rootBuildDir, buildDir),
        webAssetsPath = '/' + relBuildDir + '/assets';

    content = content.replace(/\{C\#ASSETS\}/g, webAssetsPath);

    return content;
};

me.parse = function(config, content){

    content = me.parseVersion(config, content);
    content = me.parseAssets(config, content);

    return content;
};
