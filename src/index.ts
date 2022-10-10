import { getInput, getMultilineInput, setFailed } from '@actions/core'
import { lstatSync, readFileSync } from 'fs'
import { Web3Storage } from 'web3.storage'
import { sync as glob } from 'fast-glob'
import { resolve, basename } from 'path'
import { Readable } from 'stream'
import fetch from 'node-fetch'

(async () => {

    // Action options
    const globs = getMultilineInput('files', { required: true })
    const apiUrl = getInput('api-url')
    const secret = getInput('secret', { required: true })
    const ua = getInput('api-user-agent')
    // const throwOnBadVersionString = getBooleanInput('throw_on_bad_version_string')

    if (ua.match(/\s/)) return core.setFailed('Specified User-Agent contains whitespaces, please remove any whitespaces in the User-Agent string.')

    // Create client
    const client = new Web3Storage({
        token: secret
    })


    const files = glob(globs)
      // Map to absolute paths
      .map(fp => resolve(process.cwd(), fp))
      // Filter non-directory entries
      .filter(fp => !lstatSync(fp).isDirectory())
      // Map it to an object
      .map(fp => {
          return {
              data: new Blob([ readFileSync(fp) ], {
                  type: 'application/octet-stream'
              }), 
              name: basename(fp)
          }
      })
      // Map the object to File
      .map(blob => new File([ blob.data ], blob.name))
    
    // Send requests to create entries for those one by one and retrieve CIDs
    const stores = await Promise.all(
        files.map(file => {
            return {
                cid: client.put([ file ]), file
            }
        })
    )


    // If an API URL is specified, send a POST request with data
    if (apiUrl) stores.forEach(({ cid, file }) =>
        fetch(apiUrl, {
            body: Readable.from(
                JSON.stringify({
                    cid,
                    version: null,
                    filename: file.name
                })
            ),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': ua
            }
        })
    )

})()
