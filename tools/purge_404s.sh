#!/bin/bash

set -eu -o pipefail

if [ $# -lt 2 ]; then
	echo "USAGE: $0 MYSQL_DB MYSQL_DB_PASSWORD"
	exit 1
fi

db=$1
db_password=$2

## Find an id to restrict the search for 404s to make the queries efficient
commits=$(echo "select hash from commits order by timestamp desc limit 1" | mysql -u testreduce -p"$db_password" "$db")
previous_commit=$(echo $commits | sed 's/.* //g;')
previous_commit_res_id=$(echo "select id from results where commit_hash='$previous_commit' order by id limit 1" | mysql -u testreduce -p"$db_password" "$db")
previous_commit_res_id=$(echo $previous_commit_res_id | sed 's/.* //g;')

echo "-- sql commands to run --"
cat << END
delete from pages where id in (select page_id from results where result like '%code: 404%' and id >= $previous_commit_res_id);
delete from stats where page_id in (select page_id from results where result like '%code: 404%' and id >= $previous_commit_res_id) and id >= $previous_commit_res_id;
delete from results where page_id in (select page_id from results where result like '%code: 404%' and id >= $previous_commit_res_id) and id >= $previous_commit_res_id;
END

mysql -u testreduce -p"$db_password" "$db" << END
delete from pages where id in (select page_id from results where result like '%code: 404%' and id > $previous_commit_res_id);
delete from stats where page_id in (select page_id from results where result like '%code: 404%' and id >= $previous_commit_res_id) and id >= $previous_commit_res_id;
delete from results where page_id in (select page_id from results where result like '%code: 404%' and id >= $previous_commit_res_id) and id >= $previous_commit_res_id;
END
