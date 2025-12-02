#!/bin/bash

# Usage:
# export UPRIGHTDIFF=/usr/local/bin/uprightdiff
# `./gendiffs.sh "../configs/parsoid_vs_core_mfe/diffsettings.js" "./examples/sample.titles"`

for title in `cat $2`
do
	echo $title
	node gen.visual_diff.js --config $1 --title $title
done
