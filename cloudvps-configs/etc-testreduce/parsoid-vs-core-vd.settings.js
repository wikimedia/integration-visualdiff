module.exports = {
	// Hostname of the database server.
	host: "localhost",

	// Port number to use for connection.
	port: 3306,

	// Database to use.
	database: "parsoid_vs_core",
	// database: "parsoid_vs_core_talkns",
	// database: "parsoid_rv_deploy_targets",
	// database: "parsoid_rv2_deploy_targets", // wiktionaries right now
	// database: "incubator_wiki",

	// User for MySQL login.
	user: "testreduce",

	// Password.
	password: "<PASSWORD>",

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
	cutofftime: 1200, // 20 mins

	// Number of titles to fetch from database in one batch.
	batch: 50,

	// Ports for the webapp (for test results, regressions, etc)
	// and the co-ordinator app (for clients requesting titles, posting results)
	// Use non-conflicting ports here.
	webappPort: 8020,
	coordPort: 8021,

	// (Optional) Remote server, if any, that will generate full results
	resultServer: "http://parsoid-vs-core.wmflabs.org",

	// (Optional) Localhost server, if any, for generating the same results
	localhostServer: "http://localhost:8002/",

	// (Optional)
	generateTitleUrl: function(server, prefix, title) {
		return server.replace(/\/$/, '') + "/diff/" + prefix + "/" + title;
	},

	parsoidRTConfig: require('/srv/visualdiff/testreduce/server.visualdiff.js').parsoidRTConfig,
};
