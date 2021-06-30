const mysql = require('mysql');
const config = require("../config/mysql.config");

const mysqlConnection = mysql.createConnection({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database
});
mysqlConnection.connect((err) => {
    if (err) {
        console.log('error connecting: ' + err.stack);
        return;
    }
    console.log('success');
});

module.exports = mysqlConnection;
