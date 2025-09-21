#!/bin/bash

if [ $# -lt 3 ]; then
	echo "USAGE: $0 MYSQL_DB MYSQL_DB_PASSWORD MAX_DIFFS (csv)"
	echo "The 3rd arg (MAX_DIFFS) specifies cutoff for generating diff lists."
	echo "Add 'csv' as the fourth arg to emit a CSV instead of a wikitable which is the default."
	exit 1
fi

db=$1
db_password=$2
maxdiffs=$3
format=$4
server="http://prv-tests.wmcloud.org"
mysql="mysql -u testreduce -p${db_password} ${db} -N"

r1=$(echo "select hash from commits order by timestamp desc limit 1"  | $mysql);

if [ "$format" == "csv" ]
then
	header="Diffs from $r1"
	table_end="\n\n"
else
	header="== Diffs from $r1 =="
	table_end="|}\n\n"
fi

# FIXME: printf $header truncates it!
echo "$header"
printf "\n\n"

manydiffs=$(echo "select prefix from (select prefix, count(*) as n from pages where latest_score >= 1000 group by prefix) as wikistats where wikistats.n >= $maxdiffs;" | $mysql | tr '\n' ' ')
nodiffs=$(echo "select distinct prefix from pages where prefix not in (select prefix from (select prefix, count(*) as n from pages where latest_score >= 1000 group by prefix) as wikistats where wikistats.n >= 1) order by prefix;" | $mysql | tr '\n' ' ')

if [ "$format" == "csv" ]
then
	echo "Wikis with no significant diffs,$nodiffs"
	printf "\n"
	echo "Wikis with $maxdiffs or more significant diffs"
	echo ",Wiki,Topfails URL,Investigator,,,,Analysis summary"
	for wiki in $manydiffs
	do
		echo ",$wiki,\"=HYPERLINK(\"\"$server/topfails?wiki=$wiki\"\";\"\"Topfails\"\")\",,,,"
	done
else
	echo "''Wikis with no significant diffs:'' $nodiffs"
	echo "''Wikis with $maxdiffs or more significant diffs:''"
	for wiki in $manydiff
	do
		echo "* [$server/topfails?wiki=$wiki $wiki]"
	done
fi
printf "\n\n"

for wiki in $(echo "select prefix from (select prefix, count(*) as n from pages where latest_score >= 1000 group by prefix) as tmp where n < $maxdiffs " | $mysql)
do
	r1=$(echo "select latest_score,title from pages where prefix='$wiki' and latest_score >= 1000 /*and title not like '%:%'*/ order by latest_score desc;" | $mysql | sed 's/ /_/g;s/\t/;/g;');

	if [ "$format" == "csv" ]
	then
		echo "$wiki,Score,Hyperlinked Diff,Investigator,2nd Opinion needed?,Blocker,Phab task,Remarks"
	else
		printf "=== Diffs for %s ===\n\n" $wiki
		echo "{| class='wikitable'"
		echo "! Diff score !! Diff Link !! Investigator !! 2nd Opinion needed? !! Blocker !! Phab task !! Remarks"
	fi
	for row in $r1
	do
		cols=($(echo $row | sed 's/;/\n/g;'));
		# URL-encode to ensure these are always clickable in google sheets
		uri=$(echo -n ${cols[1]} | jq -sRr @uri | sed 's/%3A/:/g;')
		uri="$server/diff/$wiki/$uri"
		if [ "$format" == "csv" ]
		then
			echo ",${cols[0]},\"=HYPERLINK(\"\"$uri\"\";\"\"${cols[1]}\"\")\",,,,,"
		else
			echo "|${cols[0]} || [$uri ${cols[1]}] || || || || ||";
		fi
	done

	printf $table_end
done

# -- selection of 50 random non-significant diff pages --
r1=$(echo "select latest_score,title,prefix from pages where latest_score > 10 and latest_score < 1000 /*and title not like '%:%'*/ order by rand() limit 50;" | $mysql | sed 's/ /_/g;s/\t/;/g;');
if [ "$format" == "csv" ]
then
	echo "ALL,Score,Hyperlinked Diff,Investigator,2nd Opinion needed?,Blocker,Phab task,Remarks"
else
	printf "=== Non-significant diffs ===\n\n"
	echo "{| class='wikitable'"
	echo "! Diff score !! Diff Link !! Investigator !! 2nd Opinion needed? !! Blocker !! Phab task !! Remarks"
fi
for row in $r1
do
	cols=($(echo $row | sed 's/;/\n/g;'));
	# URL-encode to ensure these are always clickable in google sheets
	uri=$(echo -n ${cols[1]} | jq -sRr @uri | sed 's/%3A/:/g;')
	uri="$server/diff/${cols[2]}/$uri"
	if [ "$format" == "csv" ]
	then
		echo ",${cols[0]},\"=HYPERLINK(\"\"$uri\"\";\"\"${cols[1]}\"\")\",,,,,"
	else
		echo "|${cols[0]} || [$uri ${cols[1]}] || || || || ||";
	fi
done

printf $table_end
