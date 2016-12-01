require('dotenv').load();
var jsforce = require('jsforce');
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD + process.env.APITOKEN;
const LOGINURL = process.env.LOGINURL || 'https://login.salesforce.com';

module.exports.login = function() {
    return new Promise((resolve, reject) => {
        let conn = new jsforce.Connection({ loginUrl : LOGINURL });
        conn.login(USERNAME, PASSWORD, function(err, response) {
            if (err) { return reject(err); }
            console.log('logged in', response);
            resolve(conn);
        });
    });
}