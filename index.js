const request = require('request')

class Node {
    constructor(token, urls) {
        if (!token) throw new SyntaxError('Token is required.')
        this.token = token

        if (typeof urls === 'string') {
            this.urls = [ urls ]
        } else if (Array.isArray(urls)) {
            this.urls = urls
        }


    }

    /**
     * Makes a request to the node.
     *
     * @param {String} endpoint The endpoint to request.
     * @param {String} method The request method to make.
     * @param {Object} json The data to send with the request.
     * @param {Number} [nodeIndex] The index from the nodes array to use as the request url.
     *
     */
    async handler(endpoint, method, json, nodeIndex = 0) {
        let nodePromise = new Promise((resolve, reject) => {
            request(
                {
                    url: this.urls[nodeIndex] + endpoint,
                    headers: {
                        Authorization: `Basic ${this.token}`
                    },
                    method,
                    json
                },
                (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        resolve(body)
                    }
                    else {
                        reject(error || 'Unknown error.')
                    }
                }
            )
        })

        try {
            let body = await nodePromise
            return { success: true, body }
        } catch (error) {

            if (nodeIndex + 1 < this.urls.length) {
                return await this.handler(endpoint, method, json, nodeIndex + 1)
            } else {
                return { success: false, error }
            }
        }

    }

    /**
     * Gets basic blockchain information.
     *
     */
    async getInfo() {
        let endpoint = '/'
        let method = 'GET'
        let params = { }
        return await this.handler(endpoint, method, params)
    }

    //region Block
    //---------------------------------------------------------------------------------------

    /**
     * Gets block data by blockheight or block hash.
     *
     * @param {String} block The blockheight or blockhash to fetch.
     *
     */
    async getBlock(block) {
        let endpoint = `/block/${block}`
        let method = 'GET'
        let params = { }

        return await this.handler(endpoint, method, params)
    }

    /**
     * Gets blockdata from a range of blocks.
     *
     * @param {Number} begin The blockheight to begin on.
     * @param {Number} end The blockheight to end on (inclusive).
     *
     */
    async getBlocks(begin, end) {

        begin = Number(begin)
        end = Number(end)

        let promises = []
        for (let block = begin; block <= end; block++) {
            let endpoint = `/block/${block}`
            let method = 'GET'
            let params = { }

            promises.push(this.handler(endpoint, method, params))
        }

        return await Promise.all(promises)
            .then(responses => {
                let blocks = []
                responses.forEach(response => {
                    if (response.success && response.body) {
                        blocks.push(response.body)
                    }
                })

                return blocks
            })

    }

    //---------------------------------------------------------------------------------------
    //endregion


    //region Transaction
    //---------------------------------------------------------------------------------------

    /**
     * Gets transaction data from a given transaction hash.
     *
     * @param {String} txid The transaction hash of the transaction to fetch.
     *
     */
    async getTransaction(txid) {
        let endpoint = `/tx/${txid}`
        let method = 'GET'
        let params = { }
        return await this.handler(endpoint, method, params)
    }

    /**
     * Submits a raw transaction to the blockchain.
     *
     * @param {String} transaction The raw transaction to broadcast.
     *
     */
    async broadcastTransaction(transaction) {
        let endpoint = '/'
        let method = 'POST'
        let params = {
            method: 'sendrawtransaction',
            params: [transaction]
        }
        return await this.handler(endpoint, method, params)
    }

    //---------------------------------------------------------------------------------------
    //endregion


    //region Address
    //---------------------------------------------------------------------------------------

    /**
     * Fetch the unspent transactions for a given address.
     *
     * @param {String} address The address to get the unspent transactions of.
     *
     */
    async getUtxos(address) {
        let endpoint = `/coin/address/${address}`
        let method = 'GET'
        let params = { }
        return await this.handler(endpoint, method, params)
    }

    /**
     * Fetch the transaction history for a given address.
     *
     * @param {String} address The address to get the transactions of.
     *
     */
    async getTransactions(address) {
        let endpoint = `/tx/address/${address}`
        let method = 'GET'
        let params = { }
        return await this.handler(endpoint, method, params)
    }

    /**
     * Fetch the balance for a given address.
     *
     * @param {String} address The address to get the balance of.
     *
     */
    async getBalance(address) {
        const BigNumber = require('bignumber')
        let endpoint = `/coin/address/${address}`
        let method = 'GET'
        let params = { }
        let response = await this.handler(endpoint, method, params)

        if (response.success) {
            let utxos = response.body

            let balance = 0
            let balanceInSatoshis = 0
            utxos.forEach(utxo => {
                if (utxo.height > 0) {
                    if (typeof utxo.value === 'string') {
                        balance = new BigNumber(Number(utxo.value)).plus(balance).toString()
                    } else {
                        balanceInSatoshis = new BigNumber(Number(utxo.value)).plus(balanceInSatoshis).toString()
                    }
                }
            })

            if (balanceInSatoshis) {
                const sb = require('satoshi-bitcoin')
                balance = sb.toBitcoin(balanceInSatoshis)
            }

            return balance
        }
    }

    //---------------------------------------------------------------------------------------
    //endregion

}

module.exports = Node