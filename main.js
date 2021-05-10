const process = require( "process" );
const path = require( "path" );
const ip = require( "ip" );
const http = require( "http" );
//const RedisUtils = require( "redis-manager-utils" );
const EventEmitter = require( "events" );

process.on( "unhandledRejection" , ( reason , p )=> {
	console.error( reason, "Unhandled Rejection at Promise" , p );
	console.trace();
});
process.on( "uncaughtException" , ( err )=> {
	console.error( err , "Uncaught Exception thrown" );
	console.trace();
});

// curl -X POST -H 'Content-Type: application/json' -d '{"username":"username" , "password":"password"}' https://30e9a9079850.ngrok.io/login

( async ()=> {

	const PersonalFilePath = path.join( process.env.HOME , ".config" , "personal" , "image_upload_server.json" );
	const Personal = require( PersonalFilePath );
	module.exports.personal = Personal;

	const PORT = Personal.express.port || 1331;
	module.exports.port = PORT;

	const event_emitter = new EventEmitter();
	module.exports.event_emitter = event_emitter;

	// const python_script_subscriber = await PythonScriptSubscriber.init();
	// python_script_subscriber.redis.subscribe( "python-script-controller" );

	const express_app = require( "./express_app.js" );
	const server = http.createServer( express_app );

	server.listen( PORT , ()=> {
		console.log( "Media Server Starting" );
		console.log( `\thttp://localhost:${ PORT.toString() }` );
		console.log( `\thttp://${ ip.address() }:${ PORT.toString() }` );
	});

	process.on( "SIGINT" , ()=> {
		console.log( "\nMedia Server Shutting Down" );
		server.close();
		process.exit( 1 );
	});

})();