/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 */

'use strict';

var API = require('abricos-rest').API;

var _isInit = false;
module.exports.init = function(){
    if (_isInit){
        return;
    }
    _isInit = true;

    API.loadModule = function(moduleName){

    };

};

