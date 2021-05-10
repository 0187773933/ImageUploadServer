const express = require( "express" );
//const basicAuth = require( "express-basic-auth" );
const fs = require( "fs" );
const path = require( "path" );
const bodyParser = require( "body-parser" );
//const helmet = require( "helmet" );
const helmet = require( "helmet-csp" );
const crypto = require( "crypto" );
const cookieParser = require( "cookie-parser" );
const jwt = require( "jsonwebtoken" );
const multer = require( "multer" );
const request = require( "request" );
const shell = require( "shelljs" );
const url = require( "url" );

const rateLimiterRedisMiddleware = require( "./express_rate_limiter_middleware.js" );

// Generate Random Stuff
// pwgen -1 34 | shasum -a 256 | awk '{ print $1; }' | while read x ; do echo "${x:0:32}" ; echo "${x:32:64}" ; done && pwgen -1 34 | shasum -a 256 | awk '{ print $1; }' && pwgen -1 34 | shasum -a 256 | awk '{ print $1; }'

// https://github.com/helmetjs/helmet/issues/57
//const cors = require( "cors" );
const PORT = require( "./main.js" ).port;
const Personal = require( "./main.js" ).personal;

function DownloadImage( input_url ) {
	return new Promise( function( resolve , reject ) {
		try {
			//const cleansed_url = url.parse( input_url ).pathname;
			const cleansed_url = input_url.split( "&" )[ 0 ];
			console.log( `Cleansed URL = "${cleansed_url}"` );
			const uniqueSuffix = Date.now() + '-' + Math.round( Math.random() * 1E9 )
			const extension = path.extname( cleansed_url );
			const temp_file_name_download_path = "/home/morphs/TMP2/" + uniqueSuffix + extension;
			const temp_file_name_download_path_renamed = "/home/morphs/TMP2/" + uniqueSuffix + ".jpeg";
			//const new_file_name = Personal.upload_destination + "/" + uniqueSuffix + extension;
			const new_file_name_jpeg = Personal.upload_destination + "/" + uniqueSuffix + ".jpeg";
			const new_image_url = Personal.image_bucket_url + uniqueSuffix + ".jpeg";
			// sudo apt-get install imagemagick -y
			let jpeg_conversion_command = `mogrify -background white -flatten  -format jpeg "${temp_file_name_download_path}"`
			let copy_command = `cp "${temp_file_name_download_path_renamed}" "${new_file_name_jpeg}"`;
			let remove_command_1 = `rm "${temp_file_name_download_path}"`;
			let remove_command_2 = `rm "${temp_file_name_download_path_renamed}"`;
			console.log( `Downloading to "${temp_file_name_download_path}"` );
			request.head( cleansed_url , ( err , res , body ) => {
				request( cleansed_url ).pipe( fs.createWriteStream( temp_file_name_download_path ) ).on( 'close' , () => {
					console.log( `Converting to JPEG "${jpeg_conversion_command}"` );
					shell.exec( jpeg_conversion_command , { async:false } );
					console.log( `Copying to IMGAGE_BUCKET "${copy_command}"` );
					shell.exec( copy_command , { async:false } );
					console.log( `Removing from Temp File "${remove_command_1}"` );
					shell.exec( remove_command_1 , { async:false } );
					console.log( `Removing from Temp File "${remove_command_2}"` );
					shell.exec( remove_command_2 , { async:false } );
					resolve( new_image_url );
					return;
				});
			});
		}
		catch( error ) { console.log( error ); reject( error ); return; }
	});
}

const storage = multer.diskStorage({
	destination: function ( req , file , cb ) {
		cb( null , Personal.upload_destination )
	} ,
	filename: function ( req , file , cb ) {
		const uniqueSuffix = Date.now() + '-' + Math.round( Math.random() * 1E9 )
		cb( null , uniqueSuffix + path.extname( file.originalname ) )
	}
});

// const file_example1_storage = multer.diskStorage({
// 	destination: function (req, file, cb) {
// 		cb( null , "/home/morphs/Example1DataStore/" )
// 	},
// 	filename: function (req, file, cb) {
// 		console.log( "inside multer file writer" );
// 		console.log( file.originalname );
// 		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
// 		cb(null, uniqueSuffix + path.extname(file.originalname))
// 	}
// });

const upload = multer({ storage: storage }).single("file");
//const file_example1_upload = multer({ storage: file_example1_storage }).single("file");
//const upload = multer( { dest: Personal.upload_destination } ).single("file");

const app = express();

app.use( cookieParser( Personal.cookie_secret ) );
app.use( rateLimiterRedisMiddleware );

// app.use( basicAuth({
// 	users: Personal.websocket_server.http_auth.users ,
// 	challenge: true
// }));

const HTTPS_DOMAIN_URL = Personal.https_domain_url;

//app.use( helmet() );
// Bcoz of Webkit/Safari
// https://www.npmjs.com/package/helmet-csp
app.use(
	helmet({
		directives: {
		defaultSrc: [ "'self'" , HTTPS_DOMAIN_URL ] ,
		scriptSrc: ["'self'", "'unsafe-inline'"] ,
		objectSrc: ["'none'"] ,
		upgradeInsecureRequests: [] ,
	} ,
		reportOnly: false ,
	})
);


// app.use( ( req , res , next ) => {
// 	const latest_nonce = crypto.randomBytes( 16 ).toString( "hex" );
// 	console.log( `Latest Nonce === ${latest_nonce}` );
// 	res.locals.nonce = "latest_nonce";
// 	//res.locals.nonce = "asdfasdfasdfasdfasdfasdfasdf"
// 	next();
// });

// app.use( ( req , res , next ) => {
// 	helmet({
// 	directives: {
// 		defaultSrc: [ "'self'" ] ,
// 		scriptSrc: [ "'self'" , `'nonce-${ res.locals.nonce }'` ],
// 		//scriptSrc: ["'self'", "'unsafe-inline'"]
// 	} ,
// 	})( req , res , next );
// });

// app.use( ( req , res ) => {
// 	res.end( `<script nonce="${res.locals.nonce}">console.log("${res.locals.nonce}");</script>`);
// });

app.use( express.static( path.join( __dirname , "client" ) ) );

//app.use( express.static( Personal.websocket_server.ionic_build_static_path ) );
//app.use( cors( { origin: "http://localhost:" + PORT.toString() } ) );
app.use( bodyParser.json( { limit: "50mb" } ) );
app.use( bodyParser.urlencoded( { extended: true , limit: "50mb" , parameterLimit: 50000 } ) );

//const HTMLPath = path.join( Personal.websocket_server.ionic_build_static_path , "index.html" );
const index_html_path = path.join( __dirname , "./client/views" , "index.html" );
app.get( "/images" , ( req , res ) => {
	res.sendFile( index_html_path );
});

const login_html_path = path.join( __dirname , "./client/views" , "login.html" );
app.get( "/images/login" , ( req , res ) => {
	res.sendFile( login_html_path );
});

function AuthorizedUser( username , password ) {
	try {
		for ( let i = 0; i < Personal.users.length; ++i ) {
			if ( Personal.users[ i ]["username"] === username  ) {
				if ( Personal.users[ i ]["password"] === password ) {
					return true;
				}
			}
		}
		return false;
	}
	catch( error ) { console.log( error ); return false; }
}

function AuthorizedJWT( jwt_token ) {
	try {
		return jwt.verify( jwt_token , Personal.jwt_secret , ( err , decoded ) => {
			if ( err !== null ) { return false; }
			console.log( decoded );
			return true;
		});
	}
	catch( error ) { console.log( error ); return false; }
}

// https://stackoverflow.com/a/32882427
function urlencode( str ) {
	str = ( str + '' ).toString();
	return encodeURIComponent( str )
	.replace('!', '%21')
	.replace('\'', '%27')
	.replace('(', '%28')
	.replace(')', '%29')
	.replace('*', '%2A')
	.replace('%20', '+');
}

app.post( "/images/login" , ( req , res ) => {
	if ( !req ) { res.redirect( "/images/login" ); return; }
	if ( !req.body ) { res.redirect( "/images/login" ); return; }
	if ( !req.body.username ) { res.redirect( "/images/login" ); return; }
	if ( !req.body.password ) { res.redirect( "/images/login" ); return; }
	if ( !AuthorizedUser( req.body.username , req.body.password ) ) { res.redirect( "/images/login" ); return; }
	console.log( "Username and Password Sent in Form Data Match with Some Username and Password Stored in ~/.config/personal/media_website.json" );
	console.log( "Generating New JWT Token" );
	const token = jwt.sign( { data: `${req.body.username}===${req.body.password}`  } , Personal.jwt_secret );
	console.log( token );
	//res.cookie( "mediawebsite-jwt" , token , Personal.jwt_cookie_options ); // 900000 = 15 Minutes
	res.send(token);
});

app.post( "/images/upload"  , async ( req , res ) => {
	if ( !req ) { res.redirect( "/images/login" ); return; }
	let key = req.get( "key" );
	if ( !key ) { res.redirect( "/images/login" ); return; }
	if ( !AuthorizedJWT( key ) ) { res.redirect( "/images/login" ); return; }

	//if ( !req.query ) { res.redirect( "/login" ); return; }
	//if ( !req.query.path ) { res.redirect( "/login" ); return; }

	upload( req , res , ( err ) => {
		console.log("here");
		console.log( "Recieved File Data" );
		if ( err instanceof multer.MulterError ) { res.send("wadu"); return; }
		//res.send( req.file );
		let result = Personal.image_bucket_url + req.file.filename;
		console.log( `Saved to "${result}"` );
		res.send( result );
		return;
	});

});

app.post( "/images/upload-url"  , async ( req , res ) => {
	if ( !req ) { res.redirect( "/images/login" ); return; }
	let key = req.get( "key" );
	if ( !key ) { res.redirect( "/images/login" ); return; }
	if ( !AuthorizedJWT( key ) ) { res.redirect( "/images/login" ); return; }

	//if ( !req.query ) { res.redirect( "/login" ); return; }
	//if ( !req.query.path ) { res.redirect( "/login" ); return; }

	let url = req.get( "url" );
	console.log( `Recieved URL "${url}"` );
	let result = await DownloadImage( url );
	console.log( result );
	res.send( result );
	return;

});

// Redirect Routes Example
// app.get( "/images/redirect/:newUrl" , ( req , res ) => {
// 	res.redirect(req.params.newUrl);
// });

// app.get( "/images/doi/:doi*" , ( req , res ) => {
// 	//console.log( req.params );
// 	//https://stackoverflow.com/questions/16829803/express-js-route-parameter-with-slashes
// 	let redirected_wsu_doi = `https://doi-org.ezproxy.libraries.wright.edu/${req.params.doi}${req.params['0']}`;
// 	console.log( redirected_wsu_doi );
// 	res.redirect( redirected_wsu_doi );
// });

module.exports = app;