var _ = require('underscore');
var fs = require('fs');
var debug = require('./debug');

module.exports = {
	loadJSON : function(filename,directory,wildcard) {

		if(filename) {
			return; 
		}

		if(directory) {
			var objs = [];
			fs.readdir(directory, (err, files) => {
			  if(err) {debug.logError(err); return;}
			  _.each(files, function(file) {
			    if(!wildcard || file.indexOf(wildcard >= 0)) {
			    	objs.push(JSON.parse(fs.readFileSync(directory+file)));
			    	debug.log('loaded '+file);
			    }
			  });
			});
			
			return objs;
		}

	},

	extend : function(target) {
	    var sources = [].slice.call(arguments, 1);
	    sources.forEach(function (source) {
	        for (var prop in source) {
	            target[prop] = source[prop];
	        }
	    });
	    return target;
	}


}