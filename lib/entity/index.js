/*
 * Copyright (c) 2014 Alexander Kuzmin <roosit@abricos.org>
 * Licensed under the MIT license.
 * https://github.com/abricos/grunt-abricos/blob/master/LICENSE-MIT
 */

'use strict';

var async = require('async');

var treeConfig = require('../utils/Config');
var logHelper = treeConfig.utils.helper;

var Entity = function(owner, entities){
    this.owner = owner;
    this.list = []

    this._init(entities);
};
Entity.prototype = {
    _init: function(entities){
        for (var i = 0; i < entities.length; i++){
            this._initEntity(entities[i]);
        }
    },
    _initEntity: function(className){
        var config = this.owner.config,
            logger = this.owner.logger(),
            list = this.list,
            item;

        var manager = require('./' + className);

        logger.debug('start %s initialization', logHelper.string(className));
        try {
            item = new manager({
                parentId: config.id
            });
        } catch (e) {
            logger.error('initializing %s, message=%s', logHelper.string(className), e.message);
        }
        list[list.length] = item;
    },

    add: function(item){
        if (Array.isArray(item)){
            for (var i = 0; i < item.length; i++){
                this.add(item[i]);
            }
            return;
        }
        this.list[this.list.length] = item;
    },

    each: function(fn){
        var list = this.list;
        for (var i = 0; i < list.length; i++){
            fn(list[i]);
        }
    },

    run: function(action, callback){
        var stack = [];

        this.each(function(item){
            if (typeof item[action] !== 'function'){
                return;
            }

            stack.push(function(stackCallback){
                item[action](stackCallback);
            });
        });

        async.series(stack, function(err){
            return callback ? callback(err) : null;
        });
    }
};

module.exports = Entity;
