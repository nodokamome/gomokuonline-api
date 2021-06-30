const express = require('express');
const verifyToken = require("../middlewares/verifyToken");
const mysql = require('mysql');
const mysqlConnection = require('../middlewares/mysqlConnection');

const router = express.Router();

/* GET versions listing. */
/* バージョン情報取得 */
router.get('/', verifyToken, function (req, res, next) {
    if (!req.query.platform && req.query.platform !== "ios" && req.query.platform !== "android") res.status(403).json({ message: "Error" });

    const sql = "SELECT platform, version, store FROM ?? WHERE ??=?";
    const table = ["versions", "platform", req.query.platform];
    const query = mysql.format(sql, table);

    res.header('Content-Type', 'application/json; charset=utf-8')
    mysqlConnection.query(query, function (err, rows) {
        if (err) {
            res.status(403).json({ message: err });
        } else {
            res.status(200).json({ message: "Success", data: rows[0] });
        }
    });
});

module.exports = router;
