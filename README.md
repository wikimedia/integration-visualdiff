## Install/setup

* Install dependencies
  See https://github.com/Automattic/node-canvas/wiki/Installation---Ubuntu-and-other-Debian-based-systems

* npm install
* Add $PWD/node_modules/phantomjs/bin to $PATH

## Working with proxies
* Set the HTTP_PROXY_AND_PORT if you have a proxy in between.
  Ex: HTTP_PROXY_AND_PORT=http://some.proxy:8138

## Commandline

bin/ has some commandline scripts to generating diffs

Either use the following scripts

    node bin/gen.screenshots.js --help
    node bin/diff.screenshots.js --help

OR this script

    node bin/gen.visual_diff.js --help

## Examples

``` bash
# Compare rendering of two existing HTML files (on the web)
$ node gen.visual_diff.js --outdir /tmp/ --url1 http://en.wikipedia.org/wiki/Hampi --url2 http://en.wikipedia.org/wiki/Hospet

# Compare rendering of two existing HTML files
$ node gen.visual_diff.js --outdir /tmp/ --url1 enwiki/Hampi.php.html --url2 enwiki/Hampi.parsoid.html

# Fetch PHP parser and Parsoid HTML output from their servers and compare them (read config from a config file)
$ node gen.visual_diff.js --wiki en.wikipedia.org --title Hospet --config parsoid.diffsettings.js

# Fetch PHP parser and Parsoid HTML output from their servers and compare them (config on commandline), and also dump the HTML
# after suitably postprocessing them
$ node gen.visual_diff.js --wiki en.wikipedia.org --title Hampi --html1PP ../lib/php_parser.postprocess.js --html2PP ../lib/parsoid.postprocess.js --dumpHTML1 --dumpHTML2
```

The <code>bin/examples</code> directory has a sample enwiki titles list and a bunch of example config files for 3 different use cases
* parsoid.php.diffsettings.js for comparing PHP parser output against Parsoid output
* batching.diffsettings.js for comparing Parsoid output without use of the Parsoid batching API against Parsoid output that uses the parsoid batching API
* php_output.diffsettings.js sample file (incomplete) for some use case that might compare PHP parser output in 2 different configurations

bin/examples directory also provides a rundiffs.sh script for generating diffs on a bunch of titles (provided in a file as a CLI arg) and run with a CLI-provided config file.

## Testreduce client

testreduce/ has client scripts and example config for mass testing
of visual diffs by getting titles from a testreduce server (either
from the Parsoid codebase or from the testreduce repo on github
once that is ready for use).

There is an example testreduce server settings file there as well.

## Diff server

Thin server for generating diffs to be used in combination with
testreduce server to look at diffs (since the server doesn't have
the actual images, just a numeric score).
