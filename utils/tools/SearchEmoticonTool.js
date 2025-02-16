import { AbstractTool } from './AbstractTool.js'
import fetch from 'node-fetch'

export class SearchEmoticonTool extends AbstractTool {
  name = 'searchEmoticon'

  parameters = {
    properties: {
      keyword: {
        type: 'string',
        description: '要搜索的表情包关键词'
      },
      count: {
        type: 'string',
        description: '要发送的表情包数量，默认为2，最大为3'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: '如果需要发送到特定群或用户，填写目标群号或QQ号，否则留空'
      }
    },
    required: ['keyword']
  }

  description = '用于搜索并发送表情包。当你想要搜索并发送表情包时使用此工具。'

  func = async function (opts, e) {
    let { keyword, count = '2', targetGroupIdOrQQNumber } = opts
    
    // 限制发送数量
    count = Math.min(Math.max(parseInt(count) || 2, 1), 3)
    
    // 非法值则发送到当前群聊或私聊
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)

    try {
      // 调用表情包搜索API
      const response = await fetch(`https://oiapi.net/API/EmoticonPack/?keyword=${encodeURIComponent(keyword)}`)
      const result = await response.json()

      if (!result.data || result.data.length === 0) {
        return `未找到与"${keyword}"相关的表情包`
      }

      // 随机选择指定数量的表情包
      const selectedImages = []
      const usedIndices = new Set()
      const maxTries = Math.min(count, result.data.length)

      for (let i = 0; i < maxTries; i++) {
        let randomIndex
        do {
          randomIndex = Math.floor(Math.random() * result.data.length)
        } while (usedIndices.has(randomIndex))
        
        usedIndices.add(randomIndex)
        selectedImages.push(result.data[randomIndex].url)
      }

      // 发送表情包
      const group = await e.bot.pickGroup(target)
      for (const imageUrl of selectedImages) {
        await group.sendMsg(segment.image(imageUrl))
        // 添加短暂延迟，避免发送过快
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      return `已发送${selectedImages.length}张"${keyword}"的表情包到${target}`
    } catch (err) {
      logger.error(err)
      return `搜索表情包失败: ${err.message}`
    }
  }
} 