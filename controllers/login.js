var json_util = require('../util/json');
var debug = require('../util/debug');


module.exports = {

	init : function(routedinfo) {
		routedinfo.data = json_util.extend(routedinfo.data,{
			login : routedinfo.req.session == null || routedinfo.req.session.accessToken == null
		});
		debug.log(routedinfo.req.session.accessToken);
		
		return routedinfo;
	}

}
