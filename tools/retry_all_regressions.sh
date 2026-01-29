#!/bin/bash

set -eu -o pipefail

if [ $# -lt 2 ]; then
	echo "USAGE: $0 MYSQL_DB MYSQL_DB_PASSWORD"
	exit 1
fi

db=$1
db_password=$2

commits=$(echo "select hash from commits order by timestamp desc limit 2" | mysql -u testreduce -p"$db_password" "$db")

# Yuck!
i=0
for c in $commits
do
	hashes[i]=$c
	i=$((i+1))
done

command="update pages set num_fetch_errors=0,latest_stat=null,latest_result=null,claim_hash='' where id in (select old.page_id from stats old join stats new on old.page_id=new.page_id and old.commit_hash='${hashes[2]}' and new.commit_hash='${hashes[1]}' and new.score > old.score);"
echo "-- Running sql command --"
echo $command

echo $command | mysql -u testreduce -p"$db_password" "$db"
