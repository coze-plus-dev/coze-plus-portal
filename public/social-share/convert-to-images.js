#!/usr/bin/env node

/**
 * 批量将 HTML 文件转换为图片
 *
 * 使用方法：
 * 1. 安装依赖: npm install puppeteer
 * 2. 运行脚本: node convert-to-images.js
 *
 * 生成的图片将保存在 output/ 目录下
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 输出目录
  outputDir: 'output',

  // 图片尺寸配置
  sizes: {
    square: { width: 1080, height: 1080, suffix: '-square' },      // 正方形（朋友圈、微博）
    vertical: { width: 1080, height: 1350, suffix: '-vertical' },  // 竖版（小红书）
    story: { width: 1080, height: 1920, suffix: '-story' },        // 故事（抖音、视频号）
  },

  // 默认使用的尺寸
  defaultSize: 'square',

  // 图片质量 (0-100)
  quality: 95,

  // 是否生成所有尺寸
  generateAllSizes: false,
};

// 颜色终端输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 创建输出目录
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    log(`✓ 创建输出目录: ${CONFIG.outputDir}`, 'green');
  }
}

// 获取所有 HTML 文件
function getHtmlFiles() {
  return fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.html'))
    .sort();
}

// 转换单个文件
async function convertFile(browser, filename, size) {
  const page = await browser.newPage();

  try {
    // 设置视口大小
    await page.setViewport({
      width: size.width,
      height: size.height,
      deviceScaleFactor: 2, // 2x 分辨率，更清晰
    });

    // 加载 HTML 文件
    const filePath = `file://${path.join(__dirname, filename)}`;
    await page.goto(filePath, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // 等待渲染完成
    await page.waitForTimeout(1000);

    // 生成输出文件名
    const basename = path.basename(filename, '.html');
    const outputFilename = `${basename}${size.suffix || ''}.png`;
    const outputPath = path.join(CONFIG.outputDir, outputFilename);

    // 截图
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false,
    });

    // 获取文件大小
    const stats = fs.statSync(outputPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    log(`  ✓ ${outputFilename} (${size.width}×${size.height}, ${fileSizeKB} KB)`, 'green');

  } catch (error) {
    log(`  ✗ 转换失败: ${error.message}`, 'red');
  } finally {
    await page.close();
  }
}

// 主函数
async function main() {
  log('\n🎨 开始转换 HTML 为图片\n', 'bright');

  // 创建输出目录
  ensureOutputDir();

  // 获取 HTML 文件列表
  const htmlFiles = getHtmlFiles();

  if (htmlFiles.length === 0) {
    log('❌ 未找到 HTML 文件', 'red');
    return;
  }

  log(`📋 找到 ${htmlFiles.length} 个 HTML 文件:\n`, 'blue');
  htmlFiles.forEach((file, index) => {
    log(`  ${index + 1}. ${file}`, 'yellow');
  });
  log('');

  // 启动浏览器
  log('🚀 启动浏览器...', 'blue');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // 转换每个文件
    for (let i = 0; i < htmlFiles.length; i++) {
      const filename = htmlFiles[i];
      log(`\n[${i + 1}/${htmlFiles.length}] 转换 ${filename}:`, 'bright');

      if (CONFIG.generateAllSizes) {
        // 生成所有尺寸
        for (const [sizeName, size] of Object.entries(CONFIG.sizes)) {
          await convertFile(browser, filename, size);
        }
      } else {
        // 仅生成默认尺寸
        const size = CONFIG.sizes[CONFIG.defaultSize];
        await convertFile(browser, filename, size);
      }
    }

    log('\n✅ 转换完成！', 'green');
    log(`\n📁 图片保存在: ${path.join(__dirname, CONFIG.outputDir)}\n`, 'blue');

  } catch (error) {
    log(`\n❌ 转换过程出错: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await browser.close();
  }
}

// 命令行参数处理
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
用法: node convert-to-images.js [选项]

选项:
  --all             生成所有尺寸 (正方形、竖版、故事)
  --size <size>     指定尺寸 (square, vertical, story)
  --quality <num>   图片质量 (0-100, 默认 95)
  --output <dir>    输出目录 (默认 output/)
  --help, -h        显示帮助信息

示例:
  node convert-to-images.js
  node convert-to-images.js --all
  node convert-to-images.js --size vertical
  node convert-to-images.js --quality 100 --output images/
    `);
    process.exit(0);
  }

  if (args.includes('--all')) {
    CONFIG.generateAllSizes = true;
  }

  const sizeIndex = args.indexOf('--size');
  if (sizeIndex !== -1 && args[sizeIndex + 1]) {
    CONFIG.defaultSize = args[sizeIndex + 1];
  }

  const qualityIndex = args.indexOf('--quality');
  if (qualityIndex !== -1 && args[qualityIndex + 1]) {
    CONFIG.quality = parseInt(args[qualityIndex + 1], 10);
  }

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    CONFIG.outputDir = args[outputIndex + 1];
  }
}

// 检查依赖
function checkDependencies() {
  try {
    require.resolve('puppeteer');
  } catch (e) {
    log('\n❌ 缺少依赖: puppeteer', 'red');
    log('\n请先安装依赖:', 'yellow');
    log('  npm install puppeteer\n', 'blue');
    process.exit(1);
  }
}

// 启动
if (require.main === module) {
  parseArgs();
  checkDependencies();
  main().catch(error => {
    log(`\n❌ 错误: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main, convertFile };
