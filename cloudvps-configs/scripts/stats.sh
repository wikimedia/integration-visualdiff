if [ $# -lt 2 ]; then
	echo "USAGE: $0 MYSQL_DB MYSQL_DB_PASSWORD"
	exit 1
fi

db=$1
db_password=$2

for wiki in `echo "select distinct(prefix) from pages order by prefix" | mysql -u testreduce -p $db -p"$db_password" -N`
do
	r1=`echo "select commits.hash, DATE(timestamp), ifnull(stats.n, 0), ifnull(round(stats.n * 100 / (select count(*) from pages where prefix=stats.prefix), 2), 0) as percentage from (select commit_hash, prefix, count(*) as n from stats join pages on stats.page_id = pages.id where pages.prefix='$wiki' and score<1000000 group by commit_hash) as stats right join commits on commit_hash=commits.hash order by timestamp desc limit 20;" | mysql -u testreduce -p"$db_password" $db -N | sed 's/\t/;/g'`;
	declare -A percRes;
	declare -A countRes;
	for row in `echo $r1`
	do
		cols=(`echo $row | sed 's/;/\n/g'`);
		percRes[${cols[0]}]="| ${cols[0]} || ${cols[1]} || ${cols[3]}";
		countRes[${cols[0]}]="|| ${cols[2]}";
	done

	r2=`echo "select commits.hash, ifnull(stats.n, 0), ifnull(round(stats.n * 100 / (select count(*) from pages where prefix=stats.prefix), 2), 0) as percentage from (select commit_hash, prefix, count(*) as n from stats join pages on stats.page_id = pages.id where pages.prefix='$wiki' and score<1000 group by commit_hash) as stats right join commits on commit_hash=commits.hash order by timestamp desc limit 20;" | mysql -u testreduce -p"$db_password" $db -N | sed 's/\t/;/g'`;
	for row in `echo $r2`
	do
		cols=(`echo $row | sed 's/;/\n/g'`);
		percRes[${cols[0]}]="${percRes[${cols[0]}]} || ${cols[2]}";
		countRes[${cols[0]}]="${countRes[${cols[0]}]} || ${cols[1]}";
	done

	r3=`echo "select commits.hash, ifnull(stats.n, 0), ifnull(round(stats.n * 100 / (select count(*) from pages where prefix=stats.prefix), 2), 0) as percentage from (select commit_hash, prefix, count(*) as n from stats join pages on stats.page_id = pages.id where pages.prefix='$wiki' and score = 0 group by commit_hash) as stats right join commits on commit_hash=commits.hash order by timestamp desc limit 20;" | mysql -u testreduce -p"$db_password" $db -N | sed 's/\t/;/g'`;
	for row in `echo $r3`
	do
		cols=(`echo $row | sed 's/;/\n/g'`);
		percRes[${cols[0]}]="${percRes[${cols[0]}]} || ${cols[2]}";
		countRes[${cols[0]}]="${countRes[${cols[0]}]} || ${cols[1]}";
	done

	echo "=== Stats for $wiki ==="
	echo "{| class='wikitable'"
	echo "! Test Id !! Date !! % completed !! % vertical-shift-only-or-no-diffs !! % no-diffs || # completed !! # vertical-shift-only-or-no-diffs !! # no-diffs"
	for row in `echo $r1`
	do
		echo "|-"
		cols=(`echo $row | sed 's/;/\n/g'`);
		echo "${percRes[${cols[0]}]} ${countRes[${cols[0]}]}";
	done
	echo "|}"
	echo ""
done

# 
# echo "------------- Successful tests -----------"
# echo "select *, stats.n * 100 / (select count(*) from pages where prefix=stats.prefix) as percentage from (select commit_hash, prefix, count(*) as n from stats join pages on stats.page_id = pages.id where score<1000000 group by prefix, commit_hash) as stats join commits on commit_hash=commits.hash order by prefix, timestamp desc;" | mysql -u testreduce -p"$db_password" $db -r
# 
# echo "------------- Vertical whitespace diffs -----------"
# echo "select *, stats.n * 100 / (select count(*) from pages where prefix=stats.prefix) as percentage from (select commit_hash, prefix, count(*) as n from stats join pages on stats.page_id = pages.id where score < 1000 group by prefix, commit_hash) as stats join commits on commit_hash=commits.hash order by prefix, timestamp desc;" | mysql -u testreduce -p"$db_password" $db -r
# 
# echo "------------- No diffs -----------"
# echo "select *, stats.n * 100 / (select count(*) from pages where prefix=stats.prefix) as percentage from (select commit_hash, prefix, count(*) as n from stats join pages on stats.page_id = pages.id where score=0 group by prefix, commit_hash) as stats join commits on commit_hash=commits.hash order by prefix, timestamp desc;" | mysql -u testreduce -p"$db_password" $db -r
