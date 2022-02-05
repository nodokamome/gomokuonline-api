const mysql = require('mysql');
const mysqlConnection = require('../middlewares/mysqlConnection');

function updateLoginAt(req, res, next) {
    let player_id;
    if (req.body.player_id) {
        player_id = req.body.player_id;
    }
    else if (req.query.player_id) {
        player_id = req.query.player_id;
    }

    if (player_id) {
        const sql = 'UPDATE players SET login_at=NOW() WHERE ??=?';
        const table = ['player_id', player_id];
        const query = mysql.format(sql, table);

        mysqlConnection.query(query, function (err, rows) {
            if (err) {
                return res.status(403).send({
                    message: '日付の更新に失敗しました。',
                });
            }
        });
    }
    next();
}

module.exports = updateLoginAt;
