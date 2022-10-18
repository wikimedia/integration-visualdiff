## Install/setup

* npm install
* Make sure you have a working `uprightdiff` binary.
  You may have to compile from source if the Debian-packaged version isn't compatible with your Ubuntu install.

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
$ cd bin; node gen.visual_diff.js --config <your-config-file> --title Hospet
```

The <code>bin/examples</code> directory has a sample enwiki titles list and a bunch of example config files for 3 different use cases
* parsoid.php.diffsettings.js for comparing PHP parser output against Parsoid output
* batching.diffsettings.js for comparing Parsoid output without use of the Parsoid batching API against Parsoid output that uses the parsoid batching API
* php_output.diffsettings.js sample file (incomplete) for some use case that might compare PHP parser output in 2 different configurations

bin/examples directory also provides a rundiffs.sh script for generating diffs on a bunch of titles (provided in a file as a CLI arg) and run with a CLI-provided config file.
At the very least, you may have to update the binary property for uprightdiff in the config files.

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
