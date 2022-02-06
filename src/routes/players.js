const express = require('express');
const verifyToken = require('../middlewares/verifyToken');
const updateLoginAt = require('../middlewares/updateLoginAt');
const mysql = require('mysql');
const util = require('util');
const mysqlConnection = require('../middlewares/mysqlConnection');

const router = express.Router();

/* GET players listing. */
/* プレイヤー情報取得 */
router.get('/', verifyToken, updateLoginAt, function (req, res, next) {
  const sql = () => {
    let sql = 'SELECT player_id AS playerId, name, icon, rank, match_record_win AS matchRecordWin, match_record_lose AS matchRecordLose FROM ?? '
    if (Object.keys(req.query).length !== 0) {
      sql += 'WHERE '
      if (req.query.player_id) {
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
    let table = ['players']
    // 指定プレイヤーの情報取得
    if (req.query.player_id) {
      table.push('player_id', req.query.player_id)
    } if (req.query.state) {
      table.push('state', req.query.state)
    } if (req.query.sort) {
      table.push('sort', req.query.sort)
    }

    return table
  }

  if (req.query.sort === 'rank') {
    const query = util.promisify(mysqlConnection.query).bind(mysqlConnection);
    (async () => {
      const sql = 'SELECT player_id AS playerId, name, icon, match_record_win AS matchRecordWin, match_record_lose AS matchRecordLose, FIND_IN_SET(match_record_win/(match_record_win+match_record_lose), (SELECT GROUP_CONCAT(match_record_win/(match_record_win+match_record_lose) ORDER BY match_record_win/(match_record_win+match_record_lose) DESC) FROM players)) AS rank FROM players ORDER BY `rank` ASC';
      const rows = await query(sql);

      // nullが入っているプレイヤーのランク算出
      const minRank = (() => {
        return rows.length - rows.filter(a => a.rank === null).length + 1;
      })();
      // nullが入っているプレイヤーのランク修正
      const fixRows = rows.map(a => {
        if (a.rank === null) {
          const fixRow = a;
          fixRow.rank = minRank;
          return fixRow;
        }
        return a;
      }).sort((a, b) => {
        if (a.rank < b.rank) return -1;
        if (a.rank > b.rank) return 1;
        return 0;
      });

      for (let row of fixRows) {
        const update = `UPDATE players SET rank=? WHERE ??=?`;
        const table = [row.rank, 'player_id', row.playerId];
        const query = mysql.format(update, table);
        mysqlConnection.query(query, function (err) {
          if (err) {
            res.status(403).json({ message: err });
            return;
          }
        });
      }
      res.status(200).json({ message: 'Success', data: fixRows });
    })()
    return;
  }

  const query = mysql.format(sql(), table());
  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err, rows) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    } else {
      if (rows.length === 0) {
        res.status(202).json({ message: 'Player Not Found' });
        return;
      } else {
        console.log(rows);
        res.status(200).json({ message: 'Success', data: rows });
      }
    }
  });
  return;
});

/* POST players listing */
/* プレイヤーの新規登録 */
router.post('/', verifyToken, function (req, res, next) {
  const getNewPlayerId = () => {
    while (true) {
      const S = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      const N = 8
      const playerId = Array.from(Array(N)).map(() => S[Math.floor(Math.random() * S.length)]).join('')

      const sql = 'SELECT player_id FROM ?? WHERE ??=?';
      const table = ['players', 'player_id', playerId];
      const query = mysql.format(sql, table);
      const isPlayerId = () => mysqlConnection.query(query, function (err, rows) {
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
      if (isPlayerId()) {
        return playerId;
      }
    }
  }
  const newPlayerId = getNewPlayerId()
  const newPlayerData = {
    playerId: newPlayerId,
    name: 'Player',
    icon: 'icon_1',
  }
  // 新規プレイヤー追加
  let sql = 'INSERT INTO players (player_id, name, icon) VALUE(?, ?, ?)';
  let table = [newPlayerData.playerId, newPlayerData.name, newPlayerData.icon];
  let query = mysql.format(sql, table);
  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err) {
    if (err) {
      res.status(403).json({ message: err });
    }
  });

  (async () => {
    const queryUtil = util.promisify(mysqlConnection.query).bind(mysqlConnection);
    sql = 'SELECT player_id AS playerId, name, icon, match_record_win AS matchRecordWin, match_record_lose AS matchRecordLose, FIND_IN_SET(match_record_win/(match_record_win+match_record_lose), (SELECT GROUP_CONCAT(match_record_win/(match_record_win+match_record_lose) ORDER BY match_record_win/(match_record_win+match_record_lose) DESC) FROM players)) AS rank FROM players ORDER BY `rank` ASC';
    const rows = await queryUtil(sql);

    // nullが入っているプレイヤーのランク算出
    const minRank = (() => {
      return rows.length - rows.filter(a => a.rank === null).length + 1;
    })();
    // nullが入っているプレイヤーのランク修正
    const fixRows = rows.map(a => {
      if (a.rank === null) {
        const fixRow = a;
        fixRow.rank = minRank;
        return fixRow;
      }
      return a;
    }).sort((a, b) => {
      if (a.rank < b.rank) return -1;
      if (a.rank > b.rank) return 1;
      return 0;
    });

    for (let row of fixRows) {
      let update = `UPDATE players SET rank=? WHERE ??=?`;
      let table = [row.rank, 'player_id', newPlayerData.playerId];
      mysqlConnection.query(mysql.format(update, table), function (err) {
        if (err) {
          res.status(403).json({ message: err });
          return;
        } else {

        }
      });
    }
    sql = 'SELECT player_id AS playerId, name, icon, rank, match_record_win AS matchRecordWin, match_record_lose AS matchRecordLose FROM ?? WHERE ?? = ?'
    table = ['players', 'player_id', newPlayerData.playerId]
    // 指定プレイヤーの情報取得
    query = mysql.format(sql, table);
    res.header('Content-Type', 'application/json; charset=utf-8')
    mysqlConnection.query(query, function (err, rows) {
      if (err) {
        res.status(403).json({ message: err });
        return;
      } else {
        console.log(rows);
        res.status(200).json({ message: 'Success', data: rows });
      }
    });
  })()

  return;
});

/* PUT players listing. */
/* プレイヤー情報更新 */
router.put('/:player_id/prof', verifyToken, function (req, res, next) {
  if (!req.body.name && !req.body.icon) {
    res.status(403).json({ message: 'Error' });
    return;
  }
  const sql = 'UPDATE players SET name=?, icon=? WHERE ??=?';
  const table = [req.body.name, req.body.icon, 'player_id', req.params.player_id];
  const query = mysql.format(sql, table);

  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    }
  });

  // 日付更新
  const updateSql = 'UPDATE players SET login_at=NOW() WHERE ??=?';
  const updateTable = ['player_id', req.params.player_id];
  const updateQuery = mysql.format(updateSql, updateTable);
  mysqlConnection.query(updateQuery, function (err) {
    if (err) {
      res.status(403).send({ message: '日付の更新に失敗しました。' });
      return;
    } else {
      res.status(200).json({ message: 'Success' });
      return;
    }
  });

  return;
});

/* 試合結果のインクリメント */
router.put('/:player_id/match_record', verifyToken, function (req, res, next) {
  if (!req.body.match_record || req.body.match_record !== 'win' && req.body.match_record !== 'lose') {
    res.status(403).json({ message: 'Error' });
    return;
  }

  let sql;
  let table;
  if (req.body.match_record === 'win') {
    sql = 'UPDATE players SET match_record_win = match_record_win+1 WHERE ??=?';
    table = ['player_id', req.params.player_id];
  } else if (req.body.match_record === 'lose') {
    sql = 'UPDATE players SET match_record_lose = match_record_lose+1 WHERE ??=?';
    table = ['player_id', req.params.player_id];
  }
  const query = mysql.format(sql, table);

  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err, rows) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    }
  });

  const rankQuery = util.promisify(mysqlConnection.query).bind(mysqlConnection);
  (async () => {
    const rankSql = 'SELECT player_id AS playerId, name, icon, match_record_win AS matchRecordWin, match_record_lose AS matchRecordLose, FIND_IN_SET(match_record_win/(match_record_win+match_record_lose), (SELECT GROUP_CONCAT(match_record_win/(match_record_win+match_record_lose) ORDER BY match_record_win/(match_record_win+match_record_lose) DESC) FROM players)) AS rank FROM players ORDER BY `rank` ASC';
    const rankRows = await rankQuery(rankSql);

    // nullが入っているプレイヤーのランク算出
    const minRank = (() => {
      return rankRows.length - rankRows.filter(a => a.rank === null).length + 1;
    })();
    // nullが入っているプレイヤーのランク修正
    const fixRankRows = rankRows.map(a => {
      if (a.rank === null) {
        const fixRow = a;
        fixRow.rank = minRank;
        return fixRow;
      }
      return a;
    }).sort((a, b) => {
      if (a.rank < b.rank) return -1;
      if (a.rank > b.rank) return 1;
      return 0;
    });

    for (let rankRow of fixRankRows) {
      const update = `UPDATE players SET rank=? WHERE ??=?`;
      const table = [rankRow.rank, 'player_id', rankRow.playerId];
      const query = mysql.format(update, table);
      mysqlConnection.query(query, function (err) {
        if (err) {
          res.status(403).json({ message: err });
          return;
        }
      });
    }
  })()

  // 日付更新
  const updateSql = 'UPDATE players SET login_at=NOW() WHERE ??=?';
  const updateTable = ['player_id', req.params.player_id];
  const updateQuery = mysql.format(updateSql, updateTable);
  mysqlConnection.query(updateQuery, function (err) {
    if (err) {
      res.status(403).send({ message: '日付の更新に失敗しました。' });
      return;
    } else {
      res.status(200).json({ message: 'Success' });
      return;
    }
  });

  return;
});

/* ログイン状態の更新 */
router.put('/:player_id/state', verifyToken, function (req, res, next) {
  if (!req.body.state || req.body.state !== 'online' && req.body.state !== 'offline') {
    res.status(403).json({ message: 'Error' });
    return;
  }

  const sql = 'UPDATE players SET state = ? WHERE ??=?';
  const table = [req.body.state, 'player_id', req.params.player_id];
  const query = mysql.format(sql, table);

  res.header('Content-Type', 'application/json; charset=utf-8')
  mysqlConnection.query(query, function (err) {
    if (err) {
      res.status(403).json({ message: err });
      return;
    }
  });

  // 日付更新
  const updateSql = 'UPDATE players SET login_at=NOW() WHERE ??=?';
  const updateTable = ['player_id', req.params.player_id];
  const updateQuery = mysql.format(updateSql, updateTable);
  mysqlConnection.query(updateQuery, function (err) {
    if (err) {
      res.status(403).send({ message: '日付の更新に失敗しました。' });
      return;
    } else {
      res.status(200).json({ message: 'Success' });
      return;
    }
  });

  return;
});

module.exports = router;
