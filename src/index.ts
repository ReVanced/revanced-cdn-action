import { readFileSync } from 'fs'
import { Web3Storage } from 'web3.storage'
import { basename } from 'path'
import semverCoerce from 'semver/functions/coerce'
import { debugLog, fail, getFiles, getOptions } from './util'
import Endpoint from './classes/Endpoint'
import { SemVer } from 'semver'
import { setOutput } from '@actions/core'

// CommonJS does not have top-level-await
(async () => {

    const options = getOptions()

    debugLog('Options has been retrieved.')
    debugLog({
        files: options.files,
        mainFilePattern: options.mainFilePattern,
        endpoint: options.endpoint,
        endpointUserAgent: options.endpointUA,
        endpointClientId: options.endpointClientId,
        endpointSecret: '*'.repeat(options.endpointSecret.length)
    })


    // Validations
    if (options.endpointUA.match(/\s/)) fail('Specified User-Agent contains whitespaces, please remove any whitespaces in the User-Agent string.')


    // Create client
    const client = new Web3Storage({
        token: options.endpointSecret
    })

    debugLog('CDN Client has been initialized.')


    // File system stuff
    const mainFilePattern = new RegExp(options.mainFilePattern)
    const versions: SemVer[] = []

    const files = getFiles(options.files)
        .map(fp => {
            debugLog(`Checking out file: ${fp}`)
            const name = basename(fp)

            // If the version can be coerced, make it a possible main file
            const matches = semverCoerce(name, { rtl: true })
            if (matches && mainFilePattern.test(name)) {
                debugLog('It can be coerced and matches pattern, pushing...')
                versions.push(matches)
            }

            return {
                data: new Blob([readFileSync(fp)], {
                    type: 'application/octet-stream'
                }),
                name
            }
      })
        .map(blob => new File([blob.data], blob.name))

    debugLog(`Main files ${versions.length ? 'does not exist.' : 'are found.'}`)
    if (versions.length) debugLog(versions)

    if (!versions[0]) fail('Cannot guess version.')
    if (versions.length > 1) fail(`There are ${versions.length} possible main files (re-run with debug to list). Please be more specific in your main-file-pattern. Cannot guess version.`)

    const cid = await client.put(files)
    debugLog(`Putted files. CID: ${cid}`)

    // API stuff

    const apiPostData = {
        cid,
        filenames: files.map(f => f.name),
        version: versions[0].version
    }

    if (options.endpoint && options.authEndpoint && options.endpointClientId && options.endpointSecret) {
        debugLog('Enough API options are supplied')

        const endpoint = new Endpoint({
            url: options.endpoint,
            authUrl: options.authEndpoint,
            id: options.endpointClientId,
            secret: options.endpointSecret
        })

        const token = await endpoint.fetchToken()
        await endpoint.postData(apiPostData, token)

        debugLog('POST request has been made.')
    } else {
        debugLog('Not enough API options supplied.')
        debugLog(`There ${options.endpointSecret ? 'is' : 'is not'} an endpoint secret.`)
        debugLog({
            endpoint: options.endpoint,
            authEndpoint: options.authEndpoint,
            endpointClientId: options.endpointClientId,
            endpointSecret: '*'.repeat(options.endpointSecret.length)
        })
    }

    setOutput('files', JSON.stringify(apiPostData))
})()
