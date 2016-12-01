var jsforce = require('jsforce');
var connect = require('./connect');

// connect.login()
// .catch(err => console.log(err))
// .then(conn => {
//     conn
//     .sobject('invoiceit_s__Invoice_Lines__c')
//     .find({ 'Charge_Type_Snapshot__c' : null })
//     .limit(10000)
//     .update({ }, function(err, rets) {
//         if (err) { return console.error(err); }
//         console.log(rets);
//     });
// })
const QUERY = 'SELECT Id FROM invoiceit_s__Invoice_Lines__c  WHERE Charge_Type_Snapshot__c = null';
const OBJECT_API_NAME = 'invoiceit_s__Invoice_Lines__c';
const OPERATION = 'update';

connect.login()
.catch(err => console.log(err))
.then(conn => {
    console.log(`Querying records ${QUERY}`)
    var records = [];
    var currSet = [];
    var query = conn.query(QUERY)
    .on("record", function(record) {
        currSet.push(record);
        if(currSet.length === 10000) {
            console.log(`Hit 10K records - pushing and clearing`);
            records.push(currSet);
            currSet = [];
        }
    })
    .on("end", function() {
        console.log("total in database : " + query.totalSize);
        console.log("total fetched : " + query.totalFetched);
        records.push(currSet);
        kickOffBatch(conn, records);
    })
    .on("error", function(err) {
        console.error('ERROR!!!', err);
    })
    .run({ autoFetch : true, maxFetch : 300000 }); // synonym of Query#execute();
})

function sliceRecords(records) {
    return records.slice(1, records.length);
}

function kickOffBatch(conn, records) {
    console.log('kicking off batch');
    startBatch(conn, records[0])
    .on("queue", batchInfo => {
        console.log(`Batch: ${batchInfo.jobId}, job: ${batchInfo.jobId}`);
        var job = conn.bulk.job(batchInfo.jobId);
        var batch = job.batch(batchInfo.id);
        batch.poll(5000 /* interval(ms) */, 900000 /* timeout(ms) */); // start polling
        batch.on("response", results => {
            var success = 0;
            var failure = 0;
            for (var i=0; i < results.length; i++) {
                if (results[i].success) {
                    success += 1;
                } else {
                    failure += 1;
                }
            }
            console.log(`Success: ${success} --- Failure: ${failure}\nstarting new batch? ${records.length > 0}`);
            if(records.length > 0) {
                kickOffBatch(conn, sliceRecords(records));
            } else {
                console.log('done.');
            }
        });
    });
    
}

function startBatch(conn, recs) {
    console.log('starting batch');
    var job = conn.bulk.createJob(OBJECT_API_NAME, OPERATION);
    var batch = job.createBatch();
    return batch.execute(recs);
}

// Query all records and force update
