const mysql = require('mysql');
const mysqlConnection = require('../middlewares/mysqlConnection');

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const sql = 'SELECT EXISTS (SELECT * FROM tokens WHERE ??=?) as exist';
    const table = ['token', token];
    const query = mysql.format(sql, table);
    mysqlConnection.query(query, function (err, rows) {
        if (rows[0].exist) {
            next();
        } else {
            return res.status(401).send({
                message: 'certification failed',
            });
        }
    });
}

module.exports = verifyToken;
