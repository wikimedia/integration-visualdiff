# database parsoid_vs_core
select hash,round(100*count(*)/24180,2) as no_crashers from stats join commits on commits.hash=commit_hash where score < 1000000 group by commit_hash order by timestamp desc;
select hash,round(100*count(*)/24180,2) as insig_diffs from stats join commits on commits.hash=commit_hash where score < 1000 group by commit_hash order by timestamp desc;
select hash,round(100*count(*)/24180,2) as perfect from stats join commits on commits.hash=commit_hash where score = 0 group by commit_hash order by timestamp desc;

# database parsoid_vs_core_talkns
# select hash,round(100*count(*)/10625,2) as no_crashers from stats join commits on commits.hash=commit_hash where score < 1000000 group by commit_hash order by timestamp desc;
# select hash,round(100*count(*)/10625,2) as insig_diffs from stats join commits on commits.hash=commit_hash where score < 1000 group by commit_hash order by timestamp desc;
# select hash,round(100*count(*)/10625,2) as perfect from stats join commits on commits.hash=commit_hash where score = 0 group by commit_hash order by timestamp desc;
