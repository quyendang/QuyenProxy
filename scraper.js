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

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}


function fetchPage(url, callback) {
	var useragents = [ 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Safari/605.1.15', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36', 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_6; en-en) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.1 Safari/605.1.15', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.59.10 (KHTML, like Gecko) Version/5.1.9 Safari/534.59.10', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15' ];
	var useragent = useragents[getRandomInt(useragents.length)];
	var options = {
  		url: url,
  		headers: {
    		'User-Agent': useragent
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
		try {
			fetchPage(site, function(body) {
			try {
				//var json = body.split('window["ytInitialData"] = ').pop().split('window["ytInitialPlayerResponse"]')[0];
				//json = json.replace('}}]}}}}}}};','}}]}}}}}}}');
				//var jsonData = JSON.parse(json);
				//var link = jsonData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.subMenu.channelListSubMenuRenderer.contents[0].channelListSubMenuAvatarRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url;
				var link = body.split('?bp=4gIuCggvbS8wNHJ').pop().split('","')[0];
				var linkData = 'https://www.youtube.com/feed/trending?bp=4gIuCggvbS8wNHJ' + link;
				console.log()
				console.log(linkData);
				updateRow(db, code, linkData);
				resolve();
			}
			catch (e) {
  				console.log(e);
  				resolve();
			}
		});
		}
		catch (e) {
  			console.log(e);
  			resolve();
		}
	});
}

function run(db) {
	fetchPage('https://pkgstore.datahub.io/core/country-list/data_json/data/8c458f2d15d9f2119654b29ede6e45b8/data_json.json', function(body) {
			var scrappers = [];
			var jsonData = JSON.parse(body);
			for (var i = 0; i < jsonData.length; i++) {
    			var item = jsonData[i];
    			scrappers.push(scrapper(db, "https://youtube.com/feed/trending?&gl="+ item.Code, item.Code));
			}
			Promise.all(scrappers).then(function() {
				db.close();
			});
	});
}

initDatabase(run);