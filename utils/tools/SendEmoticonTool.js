import { AbstractTool } from './AbstractTool.js'
import fs from 'fs'
import { mkdirs } from '../common.js'

export class SendEmoticonTool extends AbstractTool {
  name = 'sendEmoticon'

  parameters = {
    properties: {
      mood: {
        type: 'string',
        description: '当前的情绪状态，例如：happy(开心)、angry(生气)、sad(伤心)、surprised(惊讶)、confused(困惑)、shy(害羞)等'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: '如果需要发送到特定群或用户，填写目标群号或QQ号，否则留空'
      }
    },
    required: ['mood']
  }

  description = 'Send an emoticon to express your current emotion. You should use this tool frequently during conversation to make your responses more vivid and engaging. For example, when you feel happy about something, use mood="happy"; when surprised, use mood="surprised", etc. Available moods: happy, angry, sad, surprised, confused, shy, despise.'

  func = async function (opts, e) {
    let { mood, targetGroupIdOrQQNumber } = opts
    
    // 非法值则发送到当前群聊或私聊
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)

    try {
      // 表情包文件夹路径映射
      const moodFolders = {
        happy: 'happy',
        angry: 'angry',
        sad: 'sad',
        surprised: 'surprised',
        confused: 'confused',
        shy: 'shy',
        despise: 'despise'
      }

      // 获取对应心情的文件夹
      const folder = moodFolders[mood.toLowerCase()] || 'default'
      const basePath = process.cwd() + '/resources/tuku'
      const folderPath = `${basePath}/${folder}`

      // 确保文件夹存在, 不存在则创建
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
      }

      // 读取文件夹中的所有图片
      const files = fs.readdirSync(folderPath).filter(file => 
        file.toLowerCase().endsWith('.jpg') || 
        file.toLowerCase().endsWith('.png') || 
        file.toLowerCase().endsWith('.gif')
      )

      if (files.length === 0) {
        return `No emoticon found for mood: ${mood}. Please make sure you have emoticons in ${folderPath}`
      }

      // 随机选择一个表情包
      const randomFile = files[Math.floor(Math.random() * files.length)]
      const imagePath = `${folderPath}/${randomFile}`

      // 发送表情包
      const group = await e.bot.pickGroup(target)
      await group.sendMsg(segment.image(imagePath))

      return `Successfully sent an emoticon expressing ${mood} mood to ${target}`
    } catch (err) {
      logger.error(err)
      return `Failed to send emoticon: ${err.toString()}`
    }
  }
} 