/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var winston = require('winston');

module.exports = {
    /*
    level: function(){
        return config.get('logLevel');
    },
    /**/
    log: function(str){
        console.log(str);
    },
    debug: function(str){
        this.log(str);
    },
    info: function(str){
        this.log(str);
    },
    warn: function(str){
        this.log(str);
    },
    error: function(str){
        this.log(str);
    }
};

