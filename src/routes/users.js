const express = require('express');
const verifyToken = require("../middlewares/verifyToken");
const updateLoginAt = require("../middlewares/updateLoginAt");
const mysql = require('mysql');
const util = require('util');
const mysqlConnection = require('../middlewares/mysqlConnection');

const router = express.Router();

/* GET users listing. */
/* ユーザー情報取得 */
router.get('/', verifyToken, updateLoginAt, function (req, res, next) {
  const sql = () => {
    let sql = 'SELECT * FROM ?? '
    if (Object.keys(req.query).length !== 0) {
      sql += 'WHERE '
      if (req.query.user_id) {
        sql += '?? = ? && '
      } if (req.query.state) {
        sql += '?? = ? && '
      } if (req.query.sort) {
        sql += '?? = ?'
      }

      if (sql.slice(-4) === ' && ') {
        sql = sql.slice(0, -4);
      }
    }

    return sql;
  }

  const table = () => {
    let table = ['users']
    // 指定ユーザーの情報取得
    if (req.query.user_id) {
      table.push("user_id", req.query.user_id)
    } if (req.query.state) {
      table.push("state", req.query.state)
    } if (req.query.sort) {
      table.push("sort", req.query.sort)
    }

    return table
  }

  if (req.query.sort === "rank") {
    const query = util.promisify(mysqlConnection.query).bind(mysqlConnection);
    (async () => {
      const sql = "SELECT id, user_id, name, icon, match_record_win, match_record_lose, FIND_IN_SET(match_record_win-match_record_lose, (SELECT GROUP_CONCAT(match_record_win-match_record_lose ORDER BY match_record_win-match_record_lose DESC) FROM users)) AS rank FROM users ORDER BY `rank` ASC";
      const rows = await query(sql);

      for (let row of rows) {
        let update = `UPDATE users SET rank=? WHERE ??=?`;
        let table = [row.rank, "user_id", row.user_id];
        mysqlConnection.query(mysql.format(update, table), function (err) {
          if (err) {
            res.status(403).json({ message: err });
            return;
          }
        });
      }
      res.status(200).json({ message: "Success", data: rows });
    })()
    return;
  }

  const query = mysql.format(sql(), table());
  console.log(query);
  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err, rows) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    } else {
      if (rows.length === 0) {
        res.status(202).json({ message: `User Not Found` });
        return;
      } else {
        res.status(200).json({ message: "Success", data: rows });
      }
    }
  });
  return;
});

/* POST users listing */
/* ユーザーの新規登録 */
router.post('/', verifyToken, function (req, res, next) {
  const getNewUserId = () => {
    while (true) {
      const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      const N = 8
      const userId = Array.from(Array(N)).map(() => S[Math.floor(Math.random() * S.length)]).join('')

      const sql = "SELECT user_id FROM ?? WHERE ??=?";
      const table = ["users", "user_id", userId];
      const query = mysql.format(sql, table);
      const isUserId = () => mysqlConnection.query(query, function (err, rows) {
        if (err) {
          res.status(403).json({ message: err });
        } else {
          if (rows.length !== 0) {
            return true;
          } else {
            return false;
          }
        }
      });
      // 終了判定
      if (isUserId()) {
        return userId;
      }
    }
  }
  const newUserData = {
    userId: getNewUserId(),
    name: 'Player',
    icon: 'icon_1',
  }
  // 新規ユーザー追加
  let sql = "INSERT INTO users (user_id, name, icon) VALUE(?, ?, ?)";
  let table = [newUserData.userId, newUserData.name, newUserData.icon];
  let query = mysql.format(sql, table);
  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err) {
    if (err) {
      res.status(403).json({ message: err });
    }
  });

  // 日付更新
  sql = "UPDATE users SET login_at=NOW() WHERE ??=?";
  table = ["user_id", newUserData.userId];
  query = mysql.format(sql, table);
  mysqlConnection.query(query, function (err, rows) {
    if (err) {
      res.status(403).send({
        message: "日付の更新に失敗しました。",
      });
      return;
    } else {
      res.status(200).json({ message: "Success", data: newUserData });
    }
  });
  return;
});

/* PUT users listing. */
/* ユーザー情報更新 */
router.put('/:user_id/prof', verifyToken, function (req, res, next) {
  if (!req.body.name && !req.body.icon) {
    res.status(403).json({ message: "Error" });
    return;
  }
  const sql = "UPDATE users SET name=?, icon=? WHERE ??=?";
  const table = [req.body.name, req.body.icon, "user_id", req.params.user_id];
  const query = mysql.format(sql, table);

  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    }
  });

  // 日付更新
  const updateSql = "UPDATE users SET login_at=NOW() WHERE ??=?";
  const updateTable = ["user_id", req.params.user_id];
  const updateQuery = mysql.format(updateSql, updateTable);
  mysqlConnection.query(updateQuery, function (err) {
    if (err) {
      res.status(403).send({ message: "日付の更新に失敗しました。" });
      return;
    } else {
      res.status(200).json({ message: "Success" });
      return;
    }
  });

  return;
});

/* 試合結果のインクリメント */
router.put('/:user_id/match_record', verifyToken, function (req, res, next) {
  if (!req.body.match_record || req.body.match_record !== "win" && req.body.match_record !== "lose") {
    res.status(403).json({ message: "Error" });
    return;
  }

  let sql;
  let table;
  if (req.body.match_record === "win") {
    sql = "UPDATE users SET match_record_win = match_record_win+1 WHERE ??=?";
    table = ["user_id", req.params.user_id];
  } else if (req.body.match_record === "lose") {
    sql = "UPDATE users SET match_record_lose = match_record_lose+1 WHERE ??=?";
    table = ["user_id", req.params.user_id];
  }
  const query = mysql.format(sql, table);

  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err, rows) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    }
  });

  // 日付更新
  const updateSql = "UPDATE users SET login_at=NOW() WHERE ??=?";
  const updateTable = ["user_id", req.params.user_id];
  const updateQuery = mysql.format(updateSql, updateTable);
  mysqlConnection.query(updateQuery, function (err) {
    if (err) {
      res.status(403).send({ message: "日付の更新に失敗しました。" });
      return;
    } else {
      res.status(200).json({ message: "Success" });
      return;
    }
  });

  return;
});

/* ログイン状態の更新 */
router.put('/:user_id/state', verifyToken, function (req, res, next) {
  if (!req.body.state || req.body.state !== "online" && req.body.state !== "offline") {
    res.status(403).json({ message: "Error" });
    return;
  }

  const sql = "UPDATE users SET state = ? WHERE ??=?";
  const table = [req.body.state, "user_id", req.params.user_id];
  const query = mysql.format(sql, table);

  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    }
  });

  // 日付更新
  const updateSql = "UPDATE users SET login_at=NOW() WHERE ??=?";
  const updateTable = ["user_id", req.params.user_id];
  const updateQuery = mysql.format(updateSql, updateTable);
  mysqlConnection.query(updateQuery, function (err) {
    if (err) {
      res.status(403).send({ message: "日付の更新に失敗しました。" });
      return;
    } else {
      res.status(200).json({ message: "Success" });
      return;
    }
  });

  return;
});

module.exports = router;
