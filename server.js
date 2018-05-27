const fs = require('fs');
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const app = express();
const router = express.Router();
const port = process.env.PORT || 5000;
const url = require('url');

var sha256 = require('js-sha256');
var CryptoJS = require("crypto-js");

var MongoClient = require('mongodb').MongoClient;

var homes = require('./homes.json');
var users = require('./users.json');

var urlDB = "mongodb://heroku_h27flhnr:sradocqv54m1s2pql85nn13s7n@ds257838.mlab.com:57838/heroku_h27flhnr";

// create application/json parser
var jsonParser = bodyParser.json()
 
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

// __________________________ HOMES __________________________ 
MongoClient.connect(urlDB, function(err, database) {
	if(err) throw err;

	console.log('Connection established!');
	const myDB = database.db('heroku_h27flhnr');
	const myDBCollection = myDB.collection('homes');

	//удаление коллекции из бд
	myDBCollection.drop();

	//вставка нескольких строк(пар) в коллекцию
	myDBCollection.insertMany(homes, function(err, result){
		if(err) {
			console.log(err);
			return;
		}		
	});
	database.close();
});

// __________________________ USERS __________________________ 
MongoClient.connect(urlDB, function(err, database) {
	if(err) throw err;

	console.log('Connection established!');
	const myDB = database.db('heroku_h27flhnr');
	const myDBCollection = myDB.collection('users');

	//удаление коллекции из бд
	myDBCollection.drop();

	//вставка нескольких строк(пар) в коллекцию
	myDBCollection.insertMany(users, function(err, result){
		if(err) {
			console.log(err);
			return;
		}
	});
	database.close();
});

var key = 'qwertyuiopasdfghjklzxcvbnmqwerty';

app.get('/api', (req, res) => {
	res.json({
		message: 'Welcome to the API'
	});
});

app.post('/api/posts', verifyToken, (req, res) => {
	jwt.verify(req.token, 'secretkey', (err, authData) => {
		if(err) {
			// res.sendStatus(403);
			res.send('bad');
		} else {
			res.json({
				message: 'Posts created...',
				authData
			});
		}
	});
});

app.post('/api/register', urlencodedParser, (req, res) => {
	MongoClient.connect(urlDB, function(err, database) {
		if(err) throw err;
		const myDB = database.db('heroku_h27flhnr');
		const myDBCollection = myDB.collection('users');

		var encdata = req.body.encdata;
		encdata = encdata.replace(/ /g, '+');
		var bytes  = CryptoJS.AES.decrypt(encdata.toString(), key);
    var plaintext = bytes.toString(CryptoJS.enc.Utf8);
		var obj = JSON.parse(plaintext);
		obj.type = 'user';

		var trigger = true;
		for(var i = 0; i < users.length; i++) {
			if(users[i].login === obj.login) {
				trigger = false;
				res.send('Этот логин уже занят');
				break;
			}
			if(users[i].email === obj.email) {
				trigger = false;
				res.send('Этот почтовый адрес уже занят');
				break;
			}
		}
		if (trigger) {
			myDBCollection.insert(obj);
			users.push(obj);
			fs.writeFile("users.json", JSON.stringify(users), function(error){
					if(error) throw error;
					res.send('Регистрация прошла успешно');
			});
		}
		
		database.close();
	});
});

app.post('/api/login', urlencodedParser, (req, res) => {
	MongoClient.connect(urlDB, function(err, database) {
		if(err) throw err;
		const myDB = database.db('heroku_h27flhnr');
		const myDBCollection = myDB.collection('users');

		var encdata = req.body.encdata;
		encdata = encdata.replace(/ /g, '+');
		var bytes  = CryptoJS.AES.decrypt(encdata.toString(), key);
    var plaintext = bytes.toString(CryptoJS.enc.Utf8);
		var obj = JSON.parse(plaintext);

		myDBCollection.find().toArray(function(err, results){
	    if(err) throw err;

	    for(var i = 0; i < results.length; i++) {
	    	console.log(results[i].login);
	    	if(results[i].login === obj.login) {
	    		if(results[i].hash === obj.hash) {
	    			const user = {
	    				id: results[i]._id,
	    				login: results[i].login
	    			}
		    		jwt.sign({user: user}, 'secretkey', { expiresIn: '20s' },(err, token) => {
							res.json({
								'token': token,
								'type': results[i].type,
								'email': results[i].email
							});
						});
						break;
	    		}
	    		else {
	    			res.send('Неверно введен пароль');
	    			break;
	    		}
	    	}
	    	else {
	    		if(i === results.length-1) {
		    		res.send('Пользователь с таким логином не зарегистрирован');
		    	}
	    	}
	    }
	  });
	});
});

function verifyToken(req, res, next) {
	const bearerHeader = req.headers['authorization'];
	if(typeof bearerHeader !== 'undefined') {
		const bearer = bearerHeader.split(' ');
		const bearerToken = bearer[1];
		req.token = bearerToken;
		next();
	} else {
		res.sendStatus(403);
	}
}

app.get('/api/posts/new', (request, response) => {
	var urlParts = url.parse(request.url, true);
  var parameters = urlParts.query;

  var encdata = parameters.encdata;
  encdata = encdata.replace(/ /g, '+');
	parameters.encdata = encdata;

  var bytes  = CryptoJS.AES.decrypt(encdata, key);
	var plaintext = bytes.toString(CryptoJS.enc.Utf8);
	var obj = JSON.parse(plaintext);

	console.log('\nCurrent hash: ' + obj.hash + '\n');

	MongoClient.connect(urlDB, function(err, database) {
		if(err) throw err;
		const myDB = database.db('heroku_h27flhnr');
		const myDBCollection = myDB.collection('homes');

		var trigger = true;
		for(var i = 0; i < homes.length; i++) {
			console.log(homes[i].hash);
			if(homes[i].hash === obj.hash) {
				trigger = false;
				response.send('Данная недвижимость уже продается');
			}
		}
		if (trigger) {
			myDBCollection.insert(obj);
			homes.push(obj);
			fs.writeFile("homes.json", JSON.stringify(homes), function(error){
				if(error) throw error;
				response.send('Данные успешно получены');
			});
		}
		
		database.close();
	});
});

app.get('/api/posts/homes', (request, response) => {
	var urlParts = url.parse(request.url, true);
  var parameters = urlParts.query;

  var city = parameters.city;

	MongoClient.connect(urlDB, function(err, database) {
		if(err) throw err;
		const myDB = database.db('heroku_h27flhnr');
		const myDBCollection = myDB.collection('homes');
		
		myDBCollection.find({city: city}).toArray(function(err, results){
	    if(err) throw err;
	    response.send(results);
	  });
		
		database.close();
	});

});

app.listen(port, () => console.log(`Listening on port ${port}`));
