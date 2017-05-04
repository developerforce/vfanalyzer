var _ = require('underscore');
var debug = require('../util/debug');


exports.login = require('./login');
exports.analyzer = require('./analyzer');


exports.initControllers = function(routedinfo) {
	if(routedinfo.extensions) {

		_.each(routedinfo.extensions,function(e) {
			data = e.init(routedinfo);
		});

	}

	if(routedinfo.scripts) { //hand to the client
		routedinfo.data.scripts = routedinfo.scripts;
	}

	if(routedinfo.controller) {
		routedinfo.controller.init(routedinfo);
		if(routedinfo.action){routedinfo.action(routedinfo);}
	} else {
		routedinfo.handler(routedinfo);
	}

}
