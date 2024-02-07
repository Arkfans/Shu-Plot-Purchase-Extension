const xpath = {
    // 商店元素
    shop: '//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]',
    // 打开商店的按钮
    openShop: '//*[@id="root"]/div/div[2]/div[2]/div[3]/div',
    // 关闭商店
    closeShop: '//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[3]',
    // 用于提取当前龙门币
    money: '//*[@id="root"]/div/div[2]/div[2]/div[2]/div/div[2]/div[4]/div[2]',
    // 购买/出售详情页
    operation: '//*[@id="root"]/div/div[2]/div[2]/div[7]/div[2]',
    // 确认购买/出售
    buttonOperation: '//*[@id="root"]/div/div[2]/div[2]/div[7]/div[2]/div[2]/div[2]/div/div[2]/div[3]',
    // 关闭详情页
    closeOperation: '//*[@id="root"]/div/div[2]/div[2]/div[7]/div[2]/div[2]/div[3]',
    // 转到出售 (已在商店页面)
    toSell: '//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[2]/div/div[3]/div[1]',
    // 转到购买
    toBuy: '//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[2]/div/div[3]/div[2]',
    // 转到成熟作物购买 (即使商店未打开)
    toRipened: '//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[2]/div/div[1]/div[2]/div[1]/div[2]',
    // 购买栏水稻价格，用于判断购买的是种子还是作物
    ripenedLoc: '//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[2]/div/div[1]/div[2]/div[2]/div[1]/div[2]/span',
    // 更换用户界面
    changeUser: '//*[@id="_HG_DIALOG_ROOT"]/div/div[2]/div',
    // 关闭购买/出售成功的提示
    closeNotification: '/html/body/div[3]/div/div[2]/div[2]/div[2]/div/div[2]/button',
    notification: '/html/body/div[3]/div/div[2]/div[2]',
    // 当打开过切换账号的页面后，购买完成的确认可能会变成如下xpath
    closeNotification2: '/html/body/div[4]/div/div[2]/div[2]/div[2]/div/div[2]/button',
    // 当打开过切换账号的页面后，退出的确认可能会变成如下xpath
    notification2: '/html/body/div[4]/div/div[2]/div[2]'
}

function constructCropXpath (mark, rawXpath, offset = 0) {
    for (let i = 1; i < 7; i++) {
        xpath['crop_' + i + '_' + mark] = rawXpath[0] + (i + offset) + rawXpath[1]
    }
}

constructCropXpath('bag', ['//*[@id="root"]/div/div[2]/div[2]/div[8]/div[2]/div[2]/div[2]/div/div[1]/div[', ']/div[2]/div[3]'], 1)
constructCropXpath('price', ['//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div[', ']/div[2]/span'])
constructCropXpath('buy', ['//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[2]/div/div[1]/div[2]/div[2]/div[', ']'])
constructCropXpath('sell', ['//*[@id="root"]/div/div[2]/div[2]/div[6]/div[2]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div[', ']'])

const operationCd = 100
const operationTimeout = 1000

export {
    xpath,
    operationCd,
    operationTimeout
}
