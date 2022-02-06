const mysql = require('mysql');
const mysqlConnection = require('../middlewares/mysqlConnection');
const util = require('util');

const cronOffline = () => {
  const searchOnline = async () => {
    const sql = "SELECT player_id AS playerId, name, icon, rank, match_record_win AS matchRecordWin, match_record_lose AS matchRecordLose FROM `players` WHERE state = 'online'";
    const query = util.promisify(mysqlConnection.query).bind(mysqlConnection);
    const rows = await query(sql);
    return rows;
  }

  const updateToOffline = async (playerId) => {
    const sql = 'UPDATE players SET state = ? WHERE ??=?';
    const table = ['offline', 'player_id', playerId];
    const queryStr = mysql.format(sql, table);
    const query = util.promisify(mysqlConnection.query).bind(mysqlConnection);
    try {
      const rows = await query(queryStr);
    } catch (err) {
      console.log(err);
    }
  }

  (async () => {
    const list = await searchOnline();
    list.forEach(async a => {
      await updateToOffline(a.playerId);
    })
  })();
}

module.exports = cronOffline;
