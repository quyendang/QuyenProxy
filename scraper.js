console.log("Hello!");

var util = require("util");
var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();

function initDatabase(callback) {
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS data (code TEXT PRIMARY KEY, link TEXT)");
		callback(db);
	});
}

function updateRow(db, code, link) {
	var statementIn = db.prepare("INSERT OR IGNORE INTO data VALUES (?, ?)");
	statementIn.run(code, link);
	statementIn.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT rowid AS id, code, link FROM data", function(err, row) {
		console.log(row.id + ": " + row.code + "|" + link);
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
			var linkData = 'https://www.youtube.com/feed/trending?bp=' + body.split('?bp=').pop().split('","')[0];
			console.log()
			console.log(linkData);
			updateRow(db, code, linkData);
			resolve();
		});
	});
}

function run(db) {
	fetchPage('https://pkgstore.datahub.io/core/country-list/data_json/data/8c458f2d15d9f2119654b29ede6e45b8/data_json.json', function(body) {
			var scrappers = [];
			var jsonData = JSON.parse(body);
			for (var i = 0; i < jsonData.length; i++) {
    			var item = jsonData[i];
    			scrappers.push(scrapper(db, "https://youtube.com/feed/trending?&hl=en&client=mv-google&gl="+ item.Code, item.Code));
			}
			Promise.all(scrappers).then(function() {
				db.close();
			});
	});
}

initDatabase(run);