import { AbstractTool } from './AbstractTool.js'
import fs from 'fs'
import path from 'path'

export class SendLocalImageTool extends AbstractTool {
  name = 'sendLocalImage'
  // 存储图库信息
  static imageCategories = null

  parameters = {
    properties: {
      category: {
        type: 'string',
        description: '要发送的图片类别或关键词。我的本地图库中有这些类别：' + this.getAvailableCategories()
      },
      count: {
        type: 'string',
        description: '要发送的图片数量，默认为1，最大为3'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: '如果需要发送到特定群或用户，填写目标群号或QQ号，否则留空'
      }
    },
    required: ['category']
  }

  description = '这是我的首选图片发送工具。当用户想看任何类型的图片时，我会优先查看本地图库。我的本地图库中有这些类别：' + this.getAvailableCategories() + '。如果用户的请求与这些类别相关，我会立即从对应文件夹随机选择发送。如果用户说"发图"、"看图"、"来点图"等，我都会优先考虑使用这个工具。'

  // 获取可用的图片类别
  getAvailableCategories() {
    try {
      const baseDir = process.cwd()+'/resources/tuku'
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true })
        return '暂无图片类别'
      }

      SendLocalImageTool.imageCategories = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

      return SendLocalImageTool.imageCategories.join('、')
    } catch (err) {
      logger.error('读取图库目录失败:', err)
      return '暂无图片类别'
    }
  }

  // 查找最匹配的文件夹
  findBestMatchFolder(category) {
    const categories = SendLocalImageTool.imageCategories
    if (!categories || categories.length === 0) return null

    // 完全匹配
    const exactMatch = categories.find(name => name === category)
    if (exactMatch) return exactMatch

    // 包含匹配（双向）
    const containsMatch = categories.find(name => 
      name.toLowerCase().includes(category.toLowerCase()) || 
      category.toLowerCase().includes(name.toLowerCase())
    )
    if (containsMatch) return containsMatch

    // 关键词匹配
    const keywords = category.toLowerCase().split(/[,，\s]+/)
    const keywordMatch = categories.find(name => 
      keywords.some(keyword => 
        name.toLowerCase().includes(keyword) || 
        keyword.includes(name.toLowerCase())
      )
    )
    if (keywordMatch) return keywordMatch

    return null
  }

  func = async function (opts, e) {
    let { category, count = '1', targetGroupIdOrQQNumber } = opts
    
    // 限制发送数量
    count = Math.min(Math.max(parseInt(count) || 1, 1), 3)
    
    // 非法值则发送到当前群聊或私聊
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)

    try {
      // 刷新图库信息
      this.getAvailableCategories()
      
      // 查找匹配的文件夹
      const targetFolder = this.findBestMatchFolder(category)
      if (!targetFolder) {
        return `抱歉，我的本地图库中没有找到与"${category}"相关的图片。\n可用的图片类别有：${this.getAvailableCategories()}`
      }

      const baseDir = process.cwd()+'/resources/tuku'
      const folderPath = path.join(baseDir, targetFolder)

      // 获取文件夹中的所有图片
      const imageFiles = fs.readdirSync(folderPath)
        .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))

      if (imageFiles.length === 0) {
        return `文件夹"${targetFolder}"中没有找到图片文件。`
      }

      // 随机选择指定数量的图片
      const selectedImages = []
      const usedIndices = new Set()
      const maxTries = Math.min(count, imageFiles.length)

      for (let i = 0; i < maxTries; i++) {
        let randomIndex
        do {
          randomIndex = Math.floor(Math.random() * imageFiles.length)
        } while (usedIndices.has(randomIndex))
        
        usedIndices.add(randomIndex)
        const imagePath = path.join(folderPath, imageFiles[randomIndex])
        selectedImages.push(segment.image(imagePath))
      }

      // 发送图片
      const group = await e.bot.pickGroup(target)
      for (const image of selectedImages) {
        await group.sendMsg(image)
        // 添加短暂延迟，避免发送过快
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      return `已发送${selectedImages.length}张"${targetFolder}"的图片到${target}`
    } catch (err) {
      logger.error(err)
      return `发送本地图片失败: ${err.message}`
    }
  }
} 