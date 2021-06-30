const mysql = require('mysql');
const mysqlConnection = require('../middlewares/mysqlConnection');

function updateLoginAt(req, res, next) {
    let user_id;
    if (req.body.user_id) {
        user_id = req.body.user_id;
    }
    else if (req.query.user_id) {
        user_id = req.query.user_id;
    }

    if (user_id) {
        const sql = "UPDATE users SET login_at=NOW() WHERE ??=?";
        const table = ["user_id", user_id];
        const query = mysql.format(sql, table);

        mysqlConnection.query(query, function (err, rows) {
            if (err) {
                return res.status(403).send({
                    message: "日付の更新に失敗しました。",
                });
            }
        });
    }
    next();
}

module.exports = updateLoginAt;
