if [ $# -lt 2 ]; then
	echo "USAGE: $0 MYSQL_DB MYSQL_DB_PASSWORD"
	exit 1
fi

db=$1
db_password=$2
mysqlcmd="mysql -u testreduce -p$db_password $db -N"

cat <<END
{| class="wikitable"
|+
! rowspan="2" |Wiki
! rowspan="2" |Test date
! rowspan="2" |Tested Version
! rowspan="2" |Confidence
! colspan="4" |Visual Diff Score
|-
| Tested pages
| Pixel Perfect Rendering
| Vertical WS shifts only
| Potential issues
END

for wiki in `echo "select distinct(prefix) from pages order by prefix" | $mysqlcmd`
do
	wikirow=`echo "select claim_hash, count(*) as n, (select DATE(timestamp) from commits where commits.hash=claim_hash) as timestamp from pages where prefix='$wiki';" | $mysqlcmd`
	cols=(`echo $wikirow | sed 's/;/\n/g'`)
	commit=${cols[0]}
	pagecount=${cols[1]}
	echo "|-"
	echo "| rowspan=2 | $wiki"
 	info="| ${cols[2]} || $commit || || $pagecount"

	row=`echo "select ifnull(wikistats.n, 0), ifnull(round(wikistats.n * 100 / $pagecount, 2), 0) as percentage from (select count(*) as n from stats join pages on stats.page_id = pages.id where pages.prefix='$wiki' and score=0 and commit_hash='$commit') as wikistats" | $mysqlcmd | sed 's/\t/;/g'`
	cols=(`echo $row | sed 's/;/\n/g'`)
	perfect="|| ${cols[0]} (${cols[1]}%)"

	row=`echo "select ifnull(wikistats.n, 0), ifnull(round(wikistats.n * 100 / $pagecount, 2), 0) as percentage from (select count(*) as n from stats join pages on stats.page_id = pages.id where pages.prefix='$wiki' and score<1000 and commit_hash='$commit') as wikistats" | $mysqlcmd | sed 's/\t/;/g'`
	cols=(`echo $row | sed 's/;/\n/g'`)
	insignificant="|| ${cols[0]} (${cols[1]}%)"

	row=`echo "select ifnull(wikistats.n, 0), ifnull(round(wikistats.n * 100 / $pagecount, 2), 0) as percentage from (select count(*) as n from stats join pages on stats.page_id = pages.id where pages.prefix='$wiki' and score >= 1000 and commit_hash='$commit') as wikistats" | $mysqlcmd | sed 's/\t/;/g'`;
	cols=(`echo $row | sed 's/;/\n/g'`)
	issues="|| ${cols[0]} (${cols[1]}%)"

	echo "$info $perfect $insignificant $issues"
	echo "|-"
	echo "| colspan=7 | Remarks:"
done

echo "|}"
echo ""
