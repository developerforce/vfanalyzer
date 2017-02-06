var debug = require('../util/debug');

module.exports = {

	init : function(info) {

		if( info.req == null || info.res == null || info.handler == null ) { debug.log("Required Fields Missing"); }

		return info;

	}, 

	create : function() {

		return {
		  		data:{},
		  		extensions:[],
		  		req:req,
		  		res:res,
		  		handler:function(info) {}
		  	}

	}

}