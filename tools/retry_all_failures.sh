#!/bin/bash

set -eu -o pipefail

if [ $# -lt 2 ]; then
	echo "USAGE: $0 MYSQL_DB MYSQL_DB_PASSWORD"
	exit 1
fi

db=$1
db_password=$2

command="update pages set num_fetch_errors=0,latest_stat=null,latest_result=null,claim_hash='' where latest_score > 0"
echo "-- Running sql command --"
echo $command

echo $command | mysql -u testreduce -p"$db_password" "$db"
