<script setup>
import { computed, ref, watch } from 'vue'
import { copy, findGCDOfArray, formatNumber, formatNumberWithCommas, calcOperationNumber, formatTime } from './util.js'

const validPage = ref(true)
const validStatus = ref(true)
const cropData = ref({ price: { crop_1: 1 } })
const running = ref(false)
const runningBill = ref({})
const eta = ref(0)
const etaString = ref('')
const totalOperation = ref(0)
const processedOperation = ref(0)
const loadingText = ref('')
const failed = ref(false)
const operationMode = ref('stable')
const allocateMode = ref('number')
const showOperationModeAlert = ref(false)

chrome.storage.sync.get(['config.operationMode', 'config.allocateMode'], function (result) {
    for (const key in result) {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
            if (key === 'config.operationMode') {
                operationMode.value = result[key]
            }
            if (key === 'config.allocateMode') {
                allocateMode.value = result[key]
            }
        }
    }
})

function setStorageData (key, value) {
    chrome.storage.sync.set({ [key]: value }, function () {

    })
}

function sendMessage (message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message).then(resp => {
            callback && callback(resp)
        }).catch(() => {
            validPage.value = false
        })
    })
}

function checkValid () {
    sendMessage({ action: 'checkValid' }, r => validStatus.value = r)
}

function getData (force) {
    sendMessage({ action: 'getData', force }, (r) => {
        if (r) {
            cropData.value = r
        }
    })
}

getData()
checkValid()

function reset () {
    running.value = false
    runningBill.value = {}
    selectedCrop.value = []
    input.value = ''
    operation.value = 'buy'
    purchaseMode.value = 'all'
    loadingText.value = ''
    eta.value = 0
    processedOperation.value = 0
    totalOperation.value = 0
}

chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === 'sendData') {
        cropData.value = request.data
    } else if (request.action === 'purchase') {
        processedOperation.value += 1
        runningBill.value[request.data.cropId] -= request.data.count
        if (!runningBill.value[request.data.cropId]) {
            delete runningBill.value[request.data.cropId]
        }
    } else if (request.action === 'complete') {
        if (!request.result) {
            failed.value = true
        }
        reset()
    } else if (request.action === 'updateETA') {
        eta.value = request.data
    }
})

function refreshETA () {
    if (eta.value) {
        const diff = Math.ceil((eta.value - Date.now()) / 1000)
        etaString.value = formatTime(diff >= 0 ? diff : 0)
    }
    if (running.value) {
        setTimeout(refreshETA, 100)
    }
}

function operate () {
    failed.value = false
    const crops = []
    const sortedCrop = getSortedCrop()
    for (let i = 0; i < sortedCrop.length; i++) {
        const cropId = sortedCrop[i]
        if (!bill.value[cropId]) {
            delete bill.value[cropId]
            continue
        }
        crops.push({ cropId, count: bill.value[cropId] })
    }

    if (crops.length) {
        loadingText.value = '正在操作'
        totalOperation.value = calcOperationNumber(crops)
        processedOperation.value = 0
        runningBill.value = copy(bill.value)
        running.value = true
        etaString.value = '-'
        refreshETA()
        sendMessage({
            action: 'operate',
            data: {
                operation: operation.value,
                crops,
                mode: operationMode.value
            }
        })
        return true
    } else {
        reset()
        return false
    }
}

function stop () {
    eta.value = 0
    etaString.value = '-'
    loadingText.value = '正在终止'
    sendMessage({
        action: 'stop'
    })
}

const cropDict = {
    crop_1: '水稻',
    crop_2: '小麦',
    crop_3: '高粱',
    crop_4: '白菜',
    crop_5: '胡萝卜',
    crop_6: '辣椒'
}

const selectedCrop = ref([])
const operation = ref('buy')
const purchaseMode = ref('all')
const input = ref('')

function getSortedCrop () {
    const res = [...selectedCrop.value]
    res.sort()
    return res
}

function getGroupMoney (group = null) {
    let res = 0
    group = group || getSortedCrop()
    if (['all', 'count', 'percentage'].indexOf(purchaseMode.value) !== -1) {
        for (let i = 0; i < group.length; i++) {
            res += cropData.value.price[group[i]]
        }
    }
    return res
}

const bill = computed(() => {
    const res = {}
    if (operation.value === 'sell') {
        if (purchaseMode.value === 'all') {
            for (let i = 0; i < selectedCrop.value.length; i++) {
                const cropId = selectedCrop.value[i]
                res[cropId] = cropData.value.bag[cropId]
            }
        } else if (purchaseMode.value === 'count') {
            for (let i = 0; i < selectedCrop.value.length; i++) {
                const cropId = selectedCrop.value[i]
                res[cropId] = Math.min(cropData.value.bag[cropId], +input.value)
            }
        } else if (purchaseMode.value === 'percentage') {
            const p = +input.value / 100
            for (let i = 0; i < selectedCrop.value.length; i++) {
                const cropId = selectedCrop.value[i]
                res[cropId] = Math.floor(cropData.value.bag[cropId] * p)
            }
        }
    } else {
        if (purchaseMode.value === 'all') {
            if (allocateMode.value === 'number') {
                const count = Math.floor(cropData.value.money / getGroupMoney())
                for (let i = 0; i < selectedCrop.value.length; i++) {
                    const cropId = selectedCrop.value[i]
                    res[cropId] = count
                }
            } else if (allocateMode.value === 'amount') {
                const cropMoney = cropData.value.money / selectedCrop.value.length
                for (let i = 0; i < selectedCrop.value.length; i++) {
                    const cropId = selectedCrop.value[i]
                    res[cropId] = Math.floor(cropMoney / cropData.value.price[cropId])
                }
            }
        } else if (purchaseMode.value === 'count') {
            for (let i = 0; i < selectedCrop.value.length; i++) {
                const cropId = selectedCrop.value[i]
                res[cropId] = +input.value
            }
        } else if (purchaseMode.value === 'percentage') {
            const p = +input.value / 100
            const validMoney = cropData.value.money * p
            if (allocateMode.value === 'number') {
                const count = Math.floor(validMoney / getGroupMoney())
                for (let i = 0; i < selectedCrop.value.length; i++) {
                    const cropId = selectedCrop.value[i]
                    res[cropId] = count
                }
            } else if (allocateMode.value === 'amount') {
                const cropMoney = validMoney / selectedCrop.value.length
                for (let i = 0; i < selectedCrop.value.length; i++) {
                    const cropId = selectedCrop.value[i]
                    res[cropId] = Math.floor(cropMoney / cropData.value.price[cropId])
                }
            }
        } else if (purchaseMode.value === 'proportion') {
            const pattern = input.value.split(/\s+/)
            const last = pattern[pattern.length - 1]
            const length = pattern.length
            for (let i = 0; i < selectedCrop.value.length - length; i++) {
                pattern.push(last)
            }
            if (allocateMode.value === 'number') {
                let hasDecimal = false
                for (let i = 0; i < pattern.length; i++) {
                    pattern[i] = +pattern[i] || 1
                    if (!Number.isInteger(pattern[i])) {
                        hasDecimal = true
                    }
                }
                if (hasDecimal) {
                    while (true) {
                        let next = true
                        for (let i = 0; i < pattern.length; i++) {
                            pattern[i] *= 10
                            if (!Number.isInteger(pattern[i])) {
                                next = false
                            }
                        }
                        if (next) {
                            break
                        }
                    }
                    const gcd = findGCDOfArray(pattern)
                    for (let i = 0; i < pattern.length; i++) {
                        pattern[i] /= gcd
                    }
                }

                const sortedCrop = getSortedCrop()
                let singlePrice = 0
                for (let i = 0; i < sortedCrop.length; i++) {
                    const cropId = sortedCrop[i]
                    singlePrice += cropData.value.price[cropId] * pattern[i]
                }
                const count = Math.floor(cropData.value.money / singlePrice)
                for (let i = 0; i < sortedCrop.length; i++) {
                    const cropId = sortedCrop[i]
                    res[cropId] = count * pattern[i]
                }
            } else if (allocateMode.value === 'amount') {
                let total = 0
                for (let i = 0; i < pattern.length; i++) {
                    pattern[i] = +pattern[i] || 1
                    total += pattern[i]
                }
                const unitMoney = cropData.value.money / total
                const sortedCrop = getSortedCrop()
                for (let i = 0; i < sortedCrop.length; i++) {
                    const cropId = sortedCrop[i]
                    res[cropId] = Math.floor(unitMoney * pattern[i] / cropData.value.price[cropId])
                }
            }
        }
    }
    return res
})

const billTableData = ref([])
const total = ref(0)

function getBillTableData (dataSource) {
    const res = []
    const sortedCrop = getSortedCrop()
    total.value = 0
    for (let i = 0; i < sortedCrop.length; i++) {
        const cropId = sortedCrop[i]
        if (!Object.prototype.hasOwnProperty.call(dataSource.value, cropId)) {
            continue
        }
        res.push({
            name: cropDict[cropId],
            price: cropData.value.price[cropId],
            count: formatNumberWithCommas(dataSource.value[cropId]),
            money: formatNumber(dataSource.value[cropId] * cropData.value.price[cropId])
        })
        total.value += dataSource.value[cropId] * cropData.value.price[cropId]
    }
    return res
}

watch(bill, () => {
    if (!running.value) {
        billTableData.value = getBillTableData(bill)
    }
}, { deep: true })

watch(runningBill, () => {
    if (running.value) {
        billTableData.value = getBillTableData(runningBill)
    }
}, { deep: true })

function handleOperateChange () {
    purchaseMode.value = 'all'
    input.value = ''
}

function handleModeChange () {
    input.value = ''
}

function handleSelectChange () {
    handleInput(input.value, true)
}

const placeholder = computed(() => {
    if (Object.keys(selectedCrop.value).length === 0) {
        return '请选择作物'
    } else if (purchaseMode.value === 'percentage') {
        return '0~100'
    } else if (purchaseMode.value === 'all') {
        if (operation.value === 'buy') {
            if (billTableData.value.length) {
                return billTableData.value[0].count.replace(',', '')
            } else {
                return 'ALL'
            }
        } else {
            return 'ALL'
        }
    } else if (purchaseMode.value === 'count') {
        if (operation.value === 'buy') {
            return '0~' + Math.floor(cropData.value.money / getGroupMoney())
        } else {
            const bag = []
            const sortedCrop = getSortedCrop()
            for (let i = 0; i < sortedCrop.length; i++) {
                bag.push(cropData.value.bag[sortedCrop[i]])
            }
            return '0~' + Math.max(...bag)
        }
    } else if (purchaseMode.value === 'proportion') {
        return Array(getSortedCrop().length).fill(1).join(' ')
    }
    return ''
})

function handleInput (value, change = false) {
    const oldValue = change ? '' : input.value
    if (purchaseMode.value === 'percentage') {
        const number = +value
        if (isNaN(number)) {
            value = oldValue
        } else if (number < 0) {
            value = '0'
        } else if (number > 100) {
            value = '100'
        }
    } else if (operation.value === 'buy') {
        if (purchaseMode.value === 'count') {
            const max = Math.floor(cropData.value.money / getGroupMoney())
            const number = +value
            if (isNaN(number)) {
                value = oldValue
            } else if (number > max) {
                value = '' + max
            } else if (number < 0) {
                // 可以炒菜，禁止炒饭（）
                value = '0'
            }
        } else if (purchaseMode.value === 'proportion') {
            value = value.replaceAll(/([\s.])+/g, '$1')
            value = value.replaceAll(/(\d+\.\d+)\./g, '$1')
            value = value.replaceAll(/^\s/g, '')
            if (/[^\s\d.]/.test(value)) {
                value = oldValue
            }
        }
    } else {
        if (purchaseMode.value === 'count') {
            const number = +value
            if (isNaN(number)) {
                value = oldValue
            } else if (number < 0) {
                // 可以炒菜，禁止炒饭（）
                value = '0'
            } else {
                const bag = []
                const sortedCrop = getSortedCrop()
                for (let i = 0; i < sortedCrop.length; i++) {
                    bag.push(cropData.value.bag[sortedCrop[i]])
                }
                const max = Math.max(...bag)
                if (number > max) {
                    value = '' + max
                }
            }
        }
    }
    input.value = value
}
</script>

<template>
    <div style="width: 300px; font-size: 14px">
        <div style="text-align: center">
            <h2>黍的试验田 - 仓库管理插件</h2>
            <h3>
                <el-link href="https://sppe.arkfans.top/tg" target="_blank">github</el-link>
                <el-link href="https://sppe.arkfans.top/tb" target="_blank" style="margin: 0 10px">种植基地</el-link>
                <el-link href="https://sppe.arkfans.top/tp" target="_blank">发布页</el-link>
            </h3>
            <template v-if="failed">
                <h3>执行失败，请尝试刷新页面</h3>
                <p>
                    <el-link href="https://sppe.arkfans.top/tq" type="primary" target="_blank">加群反馈</el-link>
                </p>
            </template>

        </div>
        <template v-if="validPage">
            <template v-if="validStatus">
                <div v-if="cropData?.price?.crop_1">
                    <div style="width: 100%" v-loading="running">
                        <div style="width: 100%;margin-bottom: 5px">
                            <el-checkbox-group v-model="selectedCrop" @change="handleSelectChange"
                                               style="display: flex;justify-content: center;flex-wrap: wrap">
                                <el-checkbox v-for="(name,id) in cropDict" :key="id" :label="id" style="margin: 0 15px">
                                    {{
                                        name
                                    }}
                                </el-checkbox>
                            </el-checkbox-group>
                        </div>
                        <div class="flex-center" style="width: 100%; margin-bottom: 5px">
                            模式：
                            <el-switch
                                v-model="operationMode"
                                @change="(value) => {setStorageData('config.operationMode',value);showOperationModeAlert=value==='fast'}"
                                inline-prompt
                                active-text="稳定" active-value="stable"
                                inactive-text="快速" inactive-value="fast" inactive-color="#ff4949"
                            />
                            <div style="margin: 0 12px"></div>
                            分配：
                            <el-switch
                                v-model="allocateMode"
                                inline-prompt
                                @change="(value) => {setStorageData('config.allocateMode',value)}"
                                active-text="数量" active-value="number" active-color="#529b2e"
                                inactive-text="金额" inactive-value="amount" inactive-color="#b88230"
                            />
                        </div>
                        <div v-if="showOperationModeAlert" style="width: 100%; margin-bottom: 10px">
                            <el-alert type="warning">快速模式不会清理消息，可能会造成严重卡顿</el-alert>
                        </div>
                        <div style="width:100%;display: flex">
                            <el-select v-model="operation" style="width: 80px;flex-shrink: 0" placement="right-end"
                                       @change="handleOperateChange">
                                <el-option value="buy" label="购入"/>
                                <el-option value="sell" label="卖出"/>
                            </el-select>
                            <el-select v-model="purchaseMode" style="width: 90px;flex-shrink: 0" placement="right-end"
                                       @change="handleModeChange">
                                <el-option value="all" label="ALL"/>
                                <el-option value="count" label="定量"/>
                                <el-option value="percentage" label="百分比"/>
                                <el-option v-if="operation==='buy'" value="proportion" label="比例"/>
                            </el-select>
                            <el-input
                                :model-value="input"
                                @update:model-value="handleInput"
                                :placeholder="placeholder"
                                :disabled="purchaseMode==='all'"
                            />
                        </div>
                    </div>
                    <div style="text-align: center" v-if="running">
                        <h3>{{ loadingText }} {{ processedOperation }}/{{ totalOperation }} eta: {{ etaString }}</h3>
                    </div>
                    <div style="width: 100%; margin-bottom: 5px">
                        <el-table :data="billTableData" style="width: 100%">
                            <el-table-column prop="name" label="作物" :width="70"/>
                            <el-table-column prop="price" label="单价" :width="60"/>
                            <el-table-column prop="count" label="数量" :width="80"/>
                            <el-table-column prop="money" label="龙门币"/>
                        </el-table>
                    </div>
                    <div style="width:100%;display: flex;align-items: center">
                        <p style="flex-grow: 1;margin: 0">{{ operation === 'buy' ? '花费' : '获得' }}：
                            {{ formatNumberWithCommas(total) }}龙门币</p>
                        <el-button @click="stop" :disabled="!running">终止</el-button>
                        <el-button @click="operate" :disabled="running" style="margin-left: 8px">确认</el-button>
                    </div>
                </div>
                <div v-else style="width: 100%; height: 80px;display: flex;justify-content: center;align-items: center">
                    <el-button @click="getData(true)" style="margin-bottom: 10px">获取数据</el-button>
                </div>
            </template>
            <div v-else style="text-align: center">
                <h2>请在主界面打开插件</h2>
            </div>
        </template>
    </div>
</template>

<style scoped>
.flex-center {
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
