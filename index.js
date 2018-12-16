const request = require('request')

class Node {
    constructor(token, url) {
        if (!token) throw new SyntaxError('Token is required.')
        this.token = token
        this.url = url
    }

    /**
     * Makes a request to the node.
     *
     * @param {String} endpoint The endpoint to request.
     * @param {String} method The request method to make.
     * @param {String} json The data to send with the request.
     *
     */
    async handler(endpoint, method, json) {
        let nodePromise = new Promise((resolve, reject) => {
            request(
                {
                    url: this.url + endpoint,
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
            return { success: false, error }
        }

    }

    /**
     * Gets basic blockchain information.
     *
     */
    getInfo() {
        let endpoint = '/'
        let method = 'GET'
        let params = { }
        return this.handler(endpoint, method, params)
    }

    //region Block
    //---------------------------------------------------------------------------------------

    /**
     * Gets block data by blockheight or block hash.
     *
     * @param {String} block The blockheight or blockhash to fetch.
     *
     */
    getBlock(block) {

        let nodeMethod = isNaN(block) ? 'getblock' : 'getblockbyheight'

        let endpoint = '/'
        let method = 'POST'
        let params = {
            method: nodeMethod,
            params: [block, 0, 1]
        }

        return this.handler(endpoint, method, params)
    }

    /**
     * Gets blockdata from a range of blocks.
     *
     * @param {Number} begin The blockheight to begin on.
     * @param {Number} end The blockheight to end on (inclusive).
     *
     */
    getBlocks(begin, end) {

        let promises = []
        for (let block = begin; block <= end; block++) {
            let endpoint = '/'
            let method = 'POST'
            let params = {
                method: 'getblockbyheight',
                params: [block, 0, 1]
            }

            promises.push(this.handler(endpoint, method, params))
        }

        return Promise.all(promises)

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
    getTransaction(txid) {
        let endpoint = `/tx/${txid}`
        let method = 'GET'
        let params = { }
        return this.handler(endpoint, method, params)
    }

    /**
     * Submits a raw transaction to the blockchain.
     *
     * @param {String} transaction The raw transaction to broadcast.
     *
     */
    broadcastTransaction(transaction) {
        let endpoint = '/'
        let method = 'POST'
        let params = {
            method: 'sendrawtransaction',
            params: [transaction]
        }
        return this.handler(endpoint, method, params)
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
    getUtxos(address) {
        let endpoint = `/coin/address/${address}`
        let method = 'GET'
        let params = { }
        return this.handler(endpoint, method, params)
    }

    /**
     * Fetch the transaction history for a given address.
     *
     * @param {String} address The address to get the transactions of.
     *
     */
    getTransactions(address) {
        let endpoint = `/tx/address/${address}`
        let method = 'GET'
        let params = { }
        return this.handler(endpoint, method, params)
    }

    /**
     * Fetch the balance for a given address.
     *
     * @param {String} address The address to get the balance of.
     *
     */
    async getBalance(address) {
        let endpoint = `/coin/address/${address}`
        let method = 'GET'
        let params = { }
        let response = await this.handler(endpoint, method, params)

        if (response.success) {
            let utxos = response.body

            let balanceInSatoshis = 0
            utxos.forEach(utxo => {
                if (utxo.height > 0) {
                    balanceInSatoshis += utxo.value
                }
            })

            const sb = require('satoshi-bitcoin')
            let balance = sb.toBitcoin(balanceInSatoshis)

            return balance
        }
    }

    //---------------------------------------------------------------------------------------
    //endregion

}

module.exports = Node