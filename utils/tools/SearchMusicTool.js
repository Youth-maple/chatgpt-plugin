import fetch from 'node-fetch'
import { AbstractTool } from './AbstractTool.js'

export class SearchMusicTool extends AbstractTool {
  name = 'searchMusic'

  parameters = {
    properties: {
      keyword: {
        type: 'string',
        description: '音乐的标题或关键词, 可以是歌曲名或歌曲名+歌手名的组合'
      }
    },
    required: ['keyword']
  }

  func = async function (opts) {
    let { keyword } = opts
    try {
      let result = await searchMusicqq(keyword, opts.e)
      return `search result: ${result}`
    } catch (e) {
      return `music search failed: ${e}`
    }
  }

  description = 'Useful when you want to search music by keyword.'
}

export async function searchMusicqq(name, e) {
  let response = await fetch(`http://datukuai.top:1450/djs/API/QQ_Music/api.php?msg=${name}&n=1&q=7`)
  let json = await response.json()
  if (json.code === 1) {
    const song = json.data
    let id = song.songid
    let name = song.song
    let artist = song.singer
    let pic = song.picture
    let url = song.music
    let link = `https://y.qq.com/n/ryqq/songDetail/${id}`
    await SendMusicShare(e, { name: name, artist: artist, pic: pic, link: link, url: url })
    return JSON.stringify({ id, name, artist, url })
  }
  return null
}

async function SendMusicShare(e, data, to_uin = null) {
  if (!e || !e.bot?.sendOidb) {
    console.error('无效的事件对象')
    return false
  }

  let appid, appname, appsign, style = 4;
  switch (data.source) {
    case 'netease':
      appid = 100495085, appname = "com.netease.cloudmusic", appsign = "da6b069da1e2982db3e386233f68d76d";
      break;
    default:
      // 删除其他音乐平台配置，仅保留网易云
      break;
  }

  var title = data.name, singer = data.artist, prompt = '[分享]', jumpUrl, preview, musicUrl;

  let types = [];
  if (data.url == null) { types.push('url') };
  if (data.pic == null) { types.push('pic') };
  if (data.link == null) { types.push('link') };
  if (types.length > 0 && typeof (data.api) == 'function') {
    let { url, pic, link } = await data.api(data.data, types);
    if (url) { data.url = url; }
    if (pic) { data.pic = pic; }
    if (link) { data.link = link; }
  }

  typeof (data.url) == 'function' ? musicUrl = await data.url(data.data) : musicUrl = data.url;
  typeof (data.pic) == 'function' ? preview = await data.pic(data.data) : preview = data.pic;
  typeof (data.link) == 'function' ? jumpUrl = await data.link(data.data) : jumpUrl = data.link;

  if (typeof (musicUrl) != 'string' || musicUrl == '') {
    style = 0;
    musicUrl = '';
  }

  prompt = '[分享]' + title + '-' + singer;

  let recv_uin = 0;
  let send_type = 0;
  let recv_guild_id = 0;
  let ShareMusic_Guild_id = false;

  if (e.isGroup && to_uin == null) {//群聊
    recv_uin = e.group.gid;
    send_type = 1;
  } else if (e.guild_id) {//频道
    recv_uin = e.channel_id;
    recv_guild_id = e.guild_id;
    send_type = 3;
  } else if (to_uin == null) {//私聊
    recv_uin = e.friend.uid;
    send_type = 0;
  } else {//指定号码私聊
    recv_uin = to_uin;
    send_type = 0;
  }

  let body = {
    1: appid,
    2: 1,
    3: style,
    5: {
      1: 1,
      2: "0.0.0",
      3: appname,
      4: appsign,
    },
    10: send_type,
    11: recv_uin,
    12: {
      10: title,
      11: singer,
      12: prompt,
      13: jumpUrl,
      14: preview,
      16: musicUrl,
    },
    19: recv_guild_id
  };

  let payload = await e.bot.sendOidb("OidbSvc.0xb77_9", core.pb.encode(body));

  let result = core.pb.decode(payload);

  if (result[3] != 0) {
    e.reply('歌曲分享失败：' + result[3], true);
  }
}

