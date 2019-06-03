console.log("Hello!");

var util = require("util");
var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();

function initDatabase(callback) {
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		//db.run("DROP TABLE IF EXISTS data");
		db.run("CREATE TABLE IF NOT EXISTS data (code TEXT PRIMARY KEY, link TEXT)");
		callback(db);
	});
}

function updateRow(db, code, link) {
	var statementIn = db.prepare("INSERT OR IGNORE INTO data VALUES (?, ?)");
	statementIn.run(code, link);
	statementIn.finalize();

	var statementUp = db.prepare("UPDATE data SET link = ? WHERE code LIKE ?");
	statementUp.run(link, code);
	statementUp.finalize();
}

function pad(str, max, char) {
	str = str.toString();
	return str.length < max ? pad(char + str, max, char) : str;
}

function readRows(db) {
	db.each("SELECT rowid AS code, link FROM data", function(err, row) {
		if (err) return console.log("Error", util.inspect(err));
		//console.log("[" + pad(row.id.toString(), 4, "0") + "] " + pad(row.type, 9, " ") + " - " + pad(row.ip, 15, " ") + ":" + row.port.toString() + (new Array(Math.max(6 - row.port.toString().length, 0)).join(" ")) + " - " + new Date(row.lastchecked).toGMTString());
	});
}

function cleanUp(db) {
	return new Promise(function(resolve, reject) {
		db.all("SELECT * FROM data", function(err, rows) {
			if (err) {
				reject();
				return console.log("Error", util.inspect(err));
			}
			rows.filter(function(row) {
				var d = new Date(row.lastchecked);
				var r;
				if (!(r = (d.setDate(d.getDate() + 7)) >= new Date())) {
					//console.log("Removed proxy", pad(row.type, 9, " ") + " - " + pad(row.ip, 15, " ") + ":" + row.port.toString() + (new Array(Math.max(6 - row.port.toString().length, 0)).join(" ")) + " - " + new Date(row.lastchecked).toGMTString());
					db.run("DELETE FROM data WHERE code = ?", row.code);
				}
				return r;
			});
			resolve();
		});
	});
}

function fetchPage(url, callback) {
	var options = {
  		url: url,
  		headers: {
    		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Safari/605.1.15'
  		}
	};
	request(options, function(error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}



function scrapper(db, site, code) {
	return new Promise(function(resolve, reject) {
		fetchPage(site, function(body) {
			var linkData = body.split('?bp=').pop().split('","')[0];
			console.log()
			console.log(linkData);
			updateRow(db, code, linkData);
			resolve();
		});
	});
}

function run(db) {
	var scrappers = [];
	fetchPage(site, function(body) {
			var jsonData = JSON.parse(body);
			for (var i = 0; i < jsonData.length; i++) {
    			var item = jsonData[i];
    			scrappers.push(scrapper(db, "https://m.youtube.com/feed/trending?&hl=en&client=mv-google&gl="+ item.Code, item.Code));
			}
			Promise.all(scrappers).then(function() {
				cleanUp(db).then(function() {
				readRows(db);
			});
			db.close();
	});
	});
}

initDatabase(run);