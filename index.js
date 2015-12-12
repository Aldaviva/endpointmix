var graphite    = require('graphite');
var http        = require('http');
var querystring = require('querystring');
var restify     = require('restify');

var INDIGO_IP = "10.100.0.28";

process.chdir(__dirname);

if(!require('fs').existsSync('./config.json')){
	console.error('Missing config.json. See config.json.example.');
	process.exit(1);
}

process.on('uncaughtException', function(e){
	console.error(e);
});

var graphiteClient = graphite.createClient("plaintext://127.0.0.1:2003/");

var indigoSessionId = 'none';

var config = require('./config.json');

var worldRecords = require('./worldrecords');

var server = restify.createServer();

var mostRecentEndpointMix = {};

server.get("api/endpointmix", function(req, res){
	res.header('Cache-Control', 'no-cache');
	res.send(mostRecentEndpointMix);
});

server.get(/\/.*/, restify.serveStatic({
  directory: './public',
  default: 'index.html',
  maxAge: 3600
}));

server.listen(config.www.listenPort, function(){
	console.log("Listening on %s", server.url);
});

setInterval(cacheEndpointMix, 15*1000);
cacheEndpointMix();

function cacheEndpointMix(){
	getEndpointMix(function(mix){
		mostRecentEndpointMix = mix;
		console.info(JSON.stringify(mix.data.endpointsBreakup));
	});
}

function getEndpointMix(onComplete){
	var req = http.request({
		host: INDIGO_IP,
		port: 8080,
		path: '/indigo-webapp/indigo/meetings/live-meeting-summary.json?gf=%7B%22entityFilter%22%3A%22NONE%22%2C%22meetingFilter%22%3A3%2C%22entity%22%3Anull%2C%22entityDisplayName%22%3A%22%22%2C%22billableFilter%22%3Afalse%7D',
		method: 'GET',
		headers: {
			Cookie: 'JSESSIONID='+indigoSessionId
		}
	}, function(res){
		var rawBody = '';
		res.on('data', function(chunk){
			rawBody += chunk;
		});
		res.on('end', function(){
			if(res.statusCode == 302){
				renewIndigoSession(function(err){
					if(err != null){
						console.error("unable to log in to indigo: "+err.message);
					} else {
						getEndpointMix(onComplete);
					}
				});
			} else {
				var body = JSON.parse(rawBody);
				onComplete && onComplete(body);
				onEndpointMixUpdate(body.data.endpointsBreakup);
			}
		});
	});
	req.end();
}

function renewIndigoSession(onRenew){
	var req = http.request({
		host: INDIGO_IP,
		port: 8080,
		path: '/indigo-webapp/j_spring_security_check',
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		}

	}, function(res){
		var rawBody = '';
		res.on('data', function(chunk){
			rawBody += chunk;
		});
		res.on('end', function(){
			var body = JSON.parse(rawBody);
			if(body.success){
				indigoSessionId = res.headers['set-cookie'][0].match(/JSESSIONID=(.+?);/)[1];
				onRenew(null);
			} else {
				var error = new Error();
				error.message = body.errorMessage;
				onRenew(error);
			}
		});
	});

	req.write(querystring.stringify({
		j_username: config.indigo.username,
		j_password: config.indigo.password
	}));

	req.end();
}

function sendParticipantsToGraphite(participants){
	graphiteClient.write({ endpointmix: participants }, function(err){
		if(err != null){
			console.warn("failed to write metrics to graphite", err);
		}
	});
}

function onEndpointMixUpdate(participants){
	sendParticipantsToGraphite(participants);
	
	if(participants.Skinny){
		worldRecords.submitSkinnyRecord(participants.Skinny);
	}
}
