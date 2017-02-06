var c = require('../controllers/');
var m = require('../messages/');
var debug = require('../util/debug');

module.exports = {

	addContentRoutes : function(app) {

		app.get('/', function (req, res) {
		  c.initControllers(m.routedinfo.init({
		  		data:{},
		  		extensions:[c.login],
		  		req:req,
		  		res:res,
		  		handler:function(routedinfo) {
		  			res.render('pg_index',routedinfo.data);
		  			}
		  	}));
		});

		app.get('/analysis', function (req, res) {
			debug.log('loading analysis page');
			debug.log('going to use '+c.analyzer);
			c.initControllers(m.routedinfo.init({
		  		data:{},
		  		extensions:[c.login],
		  		controller:c.analyzer,
					action:c.analyzer.init_pages,
					req:req,
		  		res:res,
		  		handler:function(routedinfo) {
						debug.log('rendering analysis');
						res.render('pg_analysis',routedinfo.data);
		  			}
		  	}));
		});

		app.get('/analysis_components', function (req, res) {
			debug.log('loading analysis page');
			debug.log('going to use '+c.analyzer);
			c.initControllers(m.routedinfo.init({
					data:{},
					extensions:[c.login],
					controller:c.analyzer,
					action:c.analyzer.init_components,
					req:req,
					res:res,
					handler:function(routedinfo) {
						debug.log('rendering component analysis');
						res.render('pg_analysis',routedinfo.data);
						}
				}));
		});

	}

}
