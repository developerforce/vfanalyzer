var debug = true;
var logLevel = 0;
var environment = "dev";

module.exports = {
	setDebug : function(d,l,env) {
		debug = d;
		logLevel = l;
		environment = env;
	},

	logError : function(err,mute) {
		if(debug && !mute) {
			console.log(err);
		}
	},

	log : function(message,mute) {
		if(debug && !mute) {
			console.log(message);
		}
	},

	logShortObject : function(object,mute) {
		if(debug && !mute) {
			console.log(JSON.stringify(object).substring(0,50));
		}
	}
}