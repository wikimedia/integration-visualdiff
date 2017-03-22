/*
 * This is a sample configuration file.
 * Copy this file to server.settings.js and edit that file to fit your
 * MySQL connection and other settings.
 *
 * You can also override these settings with command line options, run
 * $ node server.js --help
 * to view them.
 */

"use strict";

module.exports = {
	// Hostname of the database server.
	host: "localhost",

	// Port number to use for connection.
	port: 3306,

	// Database to use.
	database: "testreduce",

	// User for MySQL login.
	user: "testreduce",

	// Password.
	password: "testreduce",

	// Output MySQL debug data.
	debug: false,

	// Number of times to try fetching a page.
	fetches: 6,

	// Number of times an article will be sent for testing before it's
	// considered an error.
	tries: 6,

	// Time in seconds to wait for a test result. If a test takes longer than
	// this, it will be considered a crash error. Be careful not to set this to
	// less than what any page takes to parse.
	cutofftime: 600,

	// Number of titles to fetch from database in one batch.
	batch: 50,

	// Localhost server, if any, for generating the same results
	localhostServer: "http://localhost:8000/",

	generateTitleUrl: function(server, prefix, title) {
		return server.replace(/\/$/, '') + "/diff/" + prefix + "/" + title;
	},

	parsoidRTConfig: require('./server.visualdiff.js').parsoidRTConfig,
};
