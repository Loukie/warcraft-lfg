"use strict";
var logger = process.require("api/logger.js").get("logger");
var bnetAPI = process.require("api/bnet.js");
var async = require("async");
var guildUpdateModel = process.require("models/guildUpdateModel.js");
var guildService = process.require("services/guildService.js");

//Configuration
var env = process.env.NODE_ENV || 'dev';
var config = process.require('config/config.'+env+'.json');

module.exports.importAuctions = function(){

    async.eachSeries(config.bnet_regions,function(region,callback) {
        //Get Realms
        bnetAPI.getRealms(region, function (error, realms) {
            if (error) {
                logger.error(error.message)
                return;
            }
            async.eachSeries(realms.realms,function(realm,callback){
                bnetAPI.getAuctions(region, realm.name, function (error, auctions) {
                    async.eachSeries(auctions.auctions, function (auction, callback) {
                        bnetAPI.getCharacter(region, realm.name, auction.owner, function (error, character) {
                            if (error || !character.guild) {
                                callback();
                                return;
                            }
                            guildService.get(region, character.realm, character.guild.name,function(error,guild){
                                if (error || !character.guild) {
                                    callback();
                                    return;
                                }
                                var timestampWeekAgo = new Date().getTime() - (7 * 24 * 3600 * 1000);
                                if(guild == null || guild.bnet.updated < timestampWeekAgo ) {
                                    guildUpdateModel.insertOrUpdate(region, character.realm, character.guild.name, 0, function (error) {
                                        logger.info("Insert guild  to update " + region + "-" + character.realm + "-" + character.guild.name);
                                        callback();
                                    });
                                }
                            });
                        });
                    },function(){
                        callback();
                    });
                });
            },function(){
                callback();
            });


        });
    });


};